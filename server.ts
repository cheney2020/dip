import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import Database from "better-sqlite3";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize SQLite Database
  const db = new Database('./database.sqlite');

  db.exec(`
    CREATE TABLE IF NOT EXISTS mock_flow_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      run_id TEXT,
      request_id TEXT,
      biz_no TEXT,
      name TEXT,
      amount TEXT,
      mobile TEXT,
      id_card TEXT,
      random_a INTEGER,
      random_b INTEGER,
      random_c INTEGER,
      random_d INTEGER,
      total_score INTEGER,
      score_base INTEGER,
      credit_status TEXT,
      diagnosis TEXT,
      logs TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS suspended_flows (
      run_id TEXT PRIMARY KEY,
      strategy_id TEXT,
      flow_id TEXT,
      state TEXT,
      logs TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  try { db.exec("ALTER TABLE mock_flow_results ADD COLUMN logs TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE mock_flow_results ADD COLUMN credit_status TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE mock_flow_results ADD COLUMN diagnosis TEXT;"); } catch (e) {}
  try { db.exec("ALTER TABLE mock_flow_results ADD COLUMN score_base INTEGER;"); } catch (e) {}
  try { db.exec("ALTER TABLE suspended_flows ADD COLUMN logs TEXT;"); } catch (e) {}

  // API routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.post("/api/flow/start/:flowId", async (req, res) => {
    const { flowId } = req.params;
    const { strategyId, appId, formData } = req.body;
    
    const runId = `run_${new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14)}`;

    if (flowId === 'flow-test') {
      // Test flow logic
      const { requestId, bizNo, name, scoreBase, amount, mobile, idCard } = formData || req.body;

      // Mock Strategy Config Data
      const strategyConfig = {
        strategyId: strategyId || "ST-TEST-001",
        name: strategyId === "TEST_RUN" ? "测试策略" : (strategyId || "未知策略"),
        version: "v2.4.0",
        params: {
          enableRiskCheck: true,
          threshold: 0.75,
          modelId: "risk-v4",
          callbackUrl: "https://callback.test.com"
        }
      };

      // Dynamic Parameter Replacement Logic
      // In a real system, this would come from the start node's requestBodyTemplate
      const businessData = { requestId, bizNo, name, scoreBase, amount, mobile, idCard };
      const template = JSON.stringify({
        requestId: "{{requestId}}",
        bizNo: "{{bizNo}}",
        name: "{{name}}",
        amount: "{{amount}}",
        mobile: "{{mobile}}",
        idCard: "{{idCard}}",
        scoreBase: "{{scoreBase}}"
      });

      const replacedBody = JSON.parse(
        template.replace(/{{(\w+)}}/g, (match, key) => {
          return businessData[key as keyof typeof businessData] !== undefined 
            ? String(businessData[key as keyof typeof businessData]) 
            : match;
        })
      );

      // Mock Model Node with Diagnosis Logic
      const amountNum = typeof replacedBody.amount === 'string' ? parseFloat(replacedBody.amount.replace(/,/g, '')) : (parseFloat(replacedBody.amount) || 0);
      const scoreBaseNum = parseFloat(replacedBody.scoreBase) || 0;
      
      const randomA = Math.floor(Math.random() * 101);
      const randomB = Math.floor(Math.random() * 101);
      const randomC = Math.floor(Math.random() * 101);
      const randomD = Math.floor(Math.random() * 101);
      const totalScore = randomA + randomB + randomC + randomD;

      let creditStatus = "正常";
      let diagnosis = "客户信用良好，各项指标均在正常范围内。";
      
      if (amountNum > 500000 || totalScore < 100) {
        creditStatus = "风险";
        diagnosis = totalScore < 100 
          ? `模型综合评分(${totalScore})极低，存在极高违约风险。`
          : `申请金额(¥${amountNum.toLocaleString()})过高，超出常规授信范围(¥500,000)，存在潜在违约风险。`;
      } else if (scoreBaseNum < 40 || totalScore < 180) {
        creditStatus = "异常";
        diagnosis = totalScore < 180
          ? `模型综合评分(${totalScore})低于合格线(180)，信用表现不稳定。`
          : `客户基础信用分(${scoreBaseNum})较低，历史还款记录可能存在异常。`;
      } else if ((amountNum > 100000 && scoreBaseNum < 60) || totalScore < 240) {
        creditStatus = "关注";
        diagnosis = totalScore < 240
          ? `模型综合评分(${totalScore})处于边缘地带，建议加强人工审核。`
          : `申请金额(¥${amountNum.toLocaleString()})较大且基础信用分(${scoreBaseNum})一般，建议加强人工审核。`;
      }

      // HTTP Callback Node (Simulated)
      // In a real system, this would make an HTTP request to the Strategy system
      // Here we just log it and prepare the response to tell the frontend to update status
      
      // Manual Confirmation Node (Suspend Flow)
      const flowState = {
        replacedBody,
        randomA, randomB, randomC, randomD, totalScore,
        creditStatus, diagnosis,
        strategyConfig
      };

      try {
        // Generate execution logs up to suspension
        const logs = {
          "node-start": {
            input: { ...(formData || req.body), strategyConfig },
            output: { ...replacedBody, strategyConfig }
          },
          "node-model": {
            input: { ...replacedBody, strategyConfig },
            output: { 
              randomA, randomB, randomC, randomD, totalScore, 
              creditStatus, 
              diagnosis,
              score_base: scoreBaseNum,
              appliedThreshold: strategyConfig.params.threshold 
            }
          },
          "node-http": {
            input: { strategyId, status: "pending_approval", modelResult: { totalScore } },
            output: { success: true, statusCode: 200, response: "Strategy status updated" }
          },
          "node-manual": {
            input: { approverRole: "admin", timeout: "24h" },
            output: { status: "suspended", message: "等待人工审批" }
          }
        };

        const stmt = db.prepare(`
          INSERT INTO suspended_flows (run_id, strategy_id, flow_id, state, logs)
          VALUES (?, ?, ?, ?, ?)
        `);
        stmt.run(runId, strategyId, flowId, JSON.stringify(flowState), JSON.stringify(logs));

        res.json({
          success: true,
          message: "流程已挂起，等待人工审批",
          status: "suspended",
          runId,
          requestId,
          bizNo,
          name,
          scoreBase,
          modelResult: {
            randomA, randomB, randomC, randomD, totalScore
          },
          logs
        });
      } catch (error) {
        console.error("Database error:", error);
        res.status(500).json({ success: false, message: "流程挂起失败" });
      }
    } else {
      // Generic mock response for other flows
      setTimeout(() => {
        res.json({
          success: true,
          message: "流程已启动",
          runId,
          logs: {
            "node-start": { input: req.body, output: req.body }
          }
        });
      }, 1000);
    }
  });

  app.post("/api/flow/resume/:runId", async (req, res) => {
    const { runId } = req.params;
    const { action, comment } = req.body; // 'approve' or 'reject'

    try {
      const stmt = db.prepare(`SELECT * FROM suspended_flows WHERE run_id = ?`);
      const suspendedFlow = stmt.get(runId) as any;

      if (!suspendedFlow) {
        return res.status(404).json({ success: false, message: "找不到挂起的流程" });
      }

      const state = JSON.parse(suspendedFlow.state);
      const existingLogs = suspendedFlow.logs ? JSON.parse(suspendedFlow.logs) : {};
      const { replacedBody, randomA, randomB, randomC, randomD, totalScore, creditStatus, diagnosis, strategyConfig } = state;

      if (action === 'reject') {
        const newLogs = {
          ...existingLogs,
          "node-manual": {
            input: { action, comment },
            output: { status: "rejected", message: "人工审批拒绝，流程终止" }
          }
        };

        // Save to results even if rejected so we have history
        const insertStmt = db.prepare(`
          INSERT INTO mock_flow_results (
            run_id, request_id, biz_no, name, amount, mobile, id_card, random_a, random_b, random_c, random_d, total_score, score_base, credit_status, diagnosis, logs
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        insertStmt.run(
          runId, 
          replacedBody.requestId, 
          replacedBody.bizNo, 
          replacedBody.name, 
          replacedBody.amount, 
          replacedBody.mobile, 
          replacedBody.idCard, 
          randomA, randomB, randomC, randomD, totalScore,
          replacedBody.scoreBase,
          creditStatus,
          diagnosis,
          JSON.stringify(newLogs)
        );
        
        // Delete from suspended flows
        db.prepare(`DELETE FROM suspended_flows WHERE run_id = ?`).run(runId);
        
        return res.json({
          success: true,
          message: "流程已终止",
          status: "terminated",
          logs: newLogs
        });
      }

      // If approve, continue flow (Database Node)

      const newLogs = {
        ...existingLogs,
        "node-manual": {
          input: { action, comment },
          output: { status: "approved", message: "人工审批通过，流程继续" }
        },
        "node-db": {
          input: { 
            runId, ...replacedBody, 
            randomA, randomB, randomC, randomD, totalScore, 
            creditStatus, diagnosis,
            strategyId: strategyConfig.strategyId 
          },
          output: { success: true, table: "mock_flow_results", action: "INSERT" }
        },
        "node-kafka": {
          input: { broker: "kafka://10.0.0.1:9092", topic: "strategy_final_result", payload: { runId, totalScore, name: replacedBody.name } },
          output: { success: true, messageId: `msg_${Date.now()}`, partition: 0, offset: Math.floor(Math.random() * 1000) }
        }
      };

      const insertStmt = db.prepare(`
        INSERT INTO mock_flow_results (
          run_id, request_id, biz_no, name, amount, mobile, id_card, random_a, random_b, random_c, random_d, total_score, score_base, credit_status, diagnosis, logs
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      
      insertStmt.run(
        runId, 
        replacedBody.requestId, 
        replacedBody.bizNo, 
        replacedBody.name, 
        replacedBody.amount, 
        replacedBody.mobile, 
        replacedBody.idCard, 
        randomA, randomB, randomC, randomD, totalScore,
        replacedBody.scoreBase,
        creditStatus,
        diagnosis,
        JSON.stringify(newLogs)
      );

      // Clean up suspended flow
      db.prepare(`DELETE FROM suspended_flows WHERE run_id = ?`).run(runId);

      res.json({
        success: true,
        message: "流程继续执行并完成",
        status: "completed",
        logs: newLogs
      });

    } catch (error) {
      console.error("Resume flow error:", error);
      res.status(500).json({ success: false, message: "流程恢复失败" });
    }
  });

  app.get("/api/flow/run/:runId", (req, res) => {
    const { runId } = req.params;
    
    try {
      // Check suspended flows first
      const suspended = db.prepare(`SELECT * FROM suspended_flows WHERE run_id = ?`).get(runId) as any;
      if (suspended) {
        return res.json({
          success: true,
          runId,
          status: 'suspended',
          logs: suspended.logs ? JSON.parse(suspended.logs) : null
        });
      }

      // Check completed flows
      const completed = db.prepare(`SELECT * FROM mock_flow_results WHERE run_id = ?`).get(runId) as any;
      if (completed) {
        const logs = completed.logs ? JSON.parse(completed.logs) : null;
        let status = 'completed';
        
        // Infer status from logs
        if (logs && logs["node-manual"]?.output?.status === 'rejected') {
          status = 'terminated';
        }

        return res.json({
          success: true,
          runId,
          status,
          logs
        });
      }

      res.status(404).json({ success: false, message: "Run not found" });
    } catch (error) {
      console.error("Fetch run error:", error);
      res.status(500).json({ success: false, message: "Failed to fetch run details" });
    }
  });

  app.get("/api/flow/results", async (req, res) => {
    try {
      const completedResults = db.prepare(`SELECT * FROM mock_flow_results ORDER BY created_at DESC LIMIT 50`).all() as any[];
      const suspendedResults = db.prepare(`SELECT * FROM suspended_flows ORDER BY created_at DESC LIMIT 50`).all() as any[];
      
      // Combine and format
      const combined = [
        ...completedResults.map(r => ({ ...r, is_suspended: false })),
        ...suspendedResults.map(r => {
          const state = r.state ? JSON.parse(r.state) : {};
          return {
            run_id: r.run_id,
            request_id: state.replacedBody?.requestId,
            name: state.replacedBody?.name,
            total_score: state.totalScore,
            random_a: state.randomA,
            random_b: state.randomB,
            random_c: state.randomC,
            random_d: state.randomD,
            created_at: r.created_at,
            logs: r.logs,
            is_suspended: true
          };
        })
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      res.json(combined.slice(0, 50));
    } catch (error) {
      console.error("Fetch results error:", error);
      res.status(500).json({ error: "Failed to fetch results" });
    }
  });

  app.get("/api/flow/logs/:runId", async (req, res) => {
    try {
      const { runId } = req.params;
      const result = db.prepare(`SELECT * FROM mock_flow_results WHERE run_id = ?`).get(runId) as any;
      
      if (!result) {
        return res.status(404).json({ error: "Run not found" });
      }

      // Reconstruct logs from the database record
      const logs = {
        "node-start": {
          input: { name: result.name, amount: result.amount, mobile: result.mobile, idCard: result.id_card },
          output: { name: result.name, amount: result.amount, mobile: result.mobile, idCard: result.id_card }
        },
        "node-model": {
          input: { name: result.name, amount: result.amount, mobile: result.mobile, idCard: result.id_card },
          output: { 
            randomA: result.random_a, 
            randomB: result.random_b, 
            randomC: result.random_c, 
            randomD: result.random_d, 
            totalScore: result.total_score 
          }
        },
        "node-db": {
          input: { 
            runId: result.run_id, 
            name: result.name, 
            amount: result.amount, 
            mobile: result.mobile, 
            idCard: result.id_card, 
            totalScore: result.total_score 
          },
          output: { success: true, table: "mock_flow_results", action: "INSERT" }
        }
      };

      res.json({ logs, result });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // DB Management Endpoints
  app.get("/api/db/tables", (req, res) => {
    try {
      const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`).all();
      res.json(tables);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch tables" });
    }
  });

  app.get("/api/db/schema/:table", (req, res) => {
    try {
      const { table } = req.params;
      const schema = db.prepare(`PRAGMA table_info(${table})`).all();
      res.json(schema);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch schema" });
    }
  });

  app.post("/api/db/query", (req, res) => {
    try {
      const { query } = req.body;
      if (!query || typeof query !== 'string') {
        return res.status(400).json({ error: "Invalid query" });
      }
      
      const upperQuery = query.trim().toUpperCase();
      const isSelect = upperQuery.startsWith('SELECT') || upperQuery.startsWith('PRAGMA');
      
      if (isSelect) {
        const results = db.prepare(query).all();
        res.json(results);
      } else {
        const info = db.prepare(query).run();
        res.json({ success: true, changes: info.changes, lastInsertRowid: info.lastInsertRowid });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message || "Query failed" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(console.error);

import React, { useState, useCallback, useRef, useEffect } from "react"
import { useParams, useNavigate, useSearchParams } from "react-router-dom"
import { 
  Play, Save, Webhook, BrainCircuit, Database, Globe, UserCheck, 
  MessageSquare, Flag, ChevronLeft, CheckCircle2, Trash2, 
  RefreshCw, LayoutTemplate, Plus, Cpu, Send, Square, Zap, CirclePlay, Loader2, Edit3, Clock, AlertCircle
} from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/src/components/ui/button"
import { Drawer } from "@/src/components/ui/drawer"
import { Modal } from "@/src/components/ui/modal"
import { cn } from "@/src/lib/utils"
import ReactFlow, { 
  ReactFlowProvider, 
  Background, 
  Controls, 
  addEdge, 
  useNodesState, 
  useEdgesState, 
  Handle, 
  Position,
  Connection,
  Edge,
  Node,
  useReactFlow,
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  EdgeProps
} from 'reactflow'
import 'reactflow/dist/style.css'
import dagre from 'dagre'

const NODE_TYPES_CONFIG = {
  start_node: { type: "trigger", title: "开始", icon: Zap, color: "bg-emerald-500", desc: "配置触发方式" },
  action_model: { type: "action", title: "模型调用", icon: Cpu, color: "bg-indigo-500", desc: "调用大语言模型" },
  action_db: { type: "action", title: "数据库操作", icon: Database, color: "bg-amber-500", desc: "读写业务数据库" },
  action_http: { type: "action", title: "HTTP 回调", icon: Globe, color: "bg-sky-500", desc: "向外部系统发送请求" },
  action_manual: { type: "action", title: "人工确认", icon: UserCheck, color: "bg-orange-500", desc: "等待人工审核结果" },
  action_kafka: { type: "action", title: "Kafka 下发", icon: Send, color: "bg-cyan-500", desc: "发送消息到消息队列" },
  end_node: { type: "end", title: "结束", icon: CheckCircle2, color: "bg-slate-700", desc: "流程执行终点" },
}

const CustomNode = ({ data, selected, id }: any) => {
  const Icon = data.icon;
  const isSpecial = data.nodeType === 'start_node' || data.nodeType === 'end_node';
  
  return (
    <div className={cn(
      "w-[220px] bg-white rounded-xl border shadow-sm transition-all group relative",
      selected ? "border-brand ring-2 ring-brand/20" : "border-gray-200 hover:border-brand/50",
      data.executionStatus === 'running' && "border-blue-400 ring-2 ring-blue-400/20 shadow-blue-100",
      data.executionStatus === 'success' && "border-emerald-400 shadow-emerald-100",
      data.executionStatus === 'error' && "border-red-400 shadow-red-100",
      data.executionStatus === 'suspended' && "border-amber-400 shadow-amber-100"
    )}>
      {data.executionStatus && (
        <div className="absolute -top-3 -right-3 z-20 bg-white rounded-full p-0.5 shadow-sm">
          {data.executionStatus === 'running' && <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />}
          {data.executionStatus === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
          {data.executionStatus === 'error' && <AlertCircle className="w-5 h-5 text-red-500" />}
          {data.executionStatus === 'suspended' && <Clock className="w-5 h-5 text-amber-500" />}
        </div>
      )}
      {data.type !== 'trigger' && <Handle type="target" position={Position.Top} className="w-2 h-2 bg-gray-300 border-2 border-white" />}
      <div className="p-3 flex items-center">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm", 
          isSpecial ? cn(data.color, "text-white") : cn("text-white", data.color)
        )}>
          {Icon && <Icon className="w-4 h-4" />}
        </div>
        <div className="ml-2.5 flex-1 overflow-hidden">
          <h3 className="text-xs font-bold text-gray-900 truncate">{data.title}</h3>
          <p className="text-[10px] text-gray-400 mt-0.5 truncate">{data.desc || '点击配置节点'}</p>
        </div>
      </div>
      
      {/* Hover Actions */}
      {!isSpecial && (
        <div className="absolute -top-12 right-0 hidden group-hover:flex items-center gap-1 z-10 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <div className="flex bg-white border border-gray-200 rounded-lg shadow-lg p-1">
            <button 
              className="p-1.5 text-gray-500 hover:text-brand hover:bg-brand/10 rounded-md transition-colors" 
              onClick={(e) => { e.stopPropagation(); data.onReplace?.(id); }} 
              title="替换节点"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button 
              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" 
              onClick={(e) => { e.stopPropagation(); data.onDelete?.(id); }} 
              title="删除节点"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
      
      {data.type !== 'end' && <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-gray-300 border-2 border-white" />}
    </div>
  );
};

const CustomEdge = ({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  markerEnd,
}: EdgeProps) => {
  const { setEdges, setNodes, getNodes, getEdges, screenToFlowPosition, fitView } = useReactFlow();
  const [isDragOver, setIsDragOver] = useState(false);
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const onDragOver = (evt: React.DragEvent) => {
    evt.preventDefault();
    evt.stopPropagation();
    evt.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const onDragLeave = (evt: React.DragEvent) => {
    evt.preventDefault();
    evt.stopPropagation();
    setIsDragOver(false);
  };

  const onDrop = (evt: React.DragEvent) => {
    const nodes = getNodes();
    const isReadOnly = nodes[0]?.data?.readOnly;
    if (isReadOnly) return;
    evt.preventDefault();
    evt.stopPropagation();
    setIsDragOver(false);
    const type = evt.dataTransfer.getData('application/reactflow');
    if (!type) return;

    const position = screenToFlowPosition({
      x: evt.clientX,
      y: evt.clientY,
    });

    const edges = getEdges();
    const existingNode = nodes[0];
    const handleDeleteNode = existingNode?.data?.onDelete;
    const handleReplaceNode = existingNode?.data?.onReplace;

    const config = NODE_TYPES_CONFIG[type as keyof typeof NODE_TYPES_CONFIG];
    const newNodeId = `node_${Date.now()}`;
    const newNode = {
      id: newNodeId,
      type: 'customNode',
      position,
      data: {
        ...config,
        nodeType: type,
        onDelete: handleDeleteNode,
        onReplace: handleReplaceNode
      }
    };

    const newEdges = edges.filter(e => e.id !== id).concat([
      { id: `e-${source}-${newNodeId}`, source: source, target: newNodeId, type: 'customEdge' },
      { id: `e-${newNodeId}-${target}`, source: newNodeId, target: target, type: 'customEdge' }
    ]);
    const newNodes = nodes.concat(newNode);

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(newNodes, newEdges, 'TB');

    setNodes([...layoutedNodes]);
    setEdges([...layoutedEdges]);

    window.requestAnimationFrame(() => {
      fitView({ padding: 0.2 });
    });
  };

  return (
    <>
      <BaseEdge 
        path={edgePath} 
        markerEnd={markerEnd} 
        style={{ 
          ...style, 
          strokeWidth: isDragOver ? 4 : 2, 
          stroke: isDragOver ? '#FFC72C' : '#E5E7EB',
          transition: 'stroke-width 0.2s, stroke 0.2s'
        }} 
      />
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={24}
        className="react-flow__edge-interaction cursor-crosshair"
        style={{ pointerEvents: 'all' }}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
      />
      {isDragOver && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="bg-brand text-gray-900 rounded-full p-1.5 shadow-xl z-50 flex items-center justify-center animate-in zoom-in-50 duration-200"
          >
            <Plus className="w-5 h-5" />
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
};

const nodeTypes = { customNode: CustomNode };
const edgeTypes = { customEdge: CustomEdge };

const getLayoutedElements = (nodes: Node[], edges: Edge[], direction = 'TB') => {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  const isHorizontal = direction === 'LR';
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 80 });

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: 220, height: 100 });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  nodes.forEach((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.targetPosition = isHorizontal ? Position.Left : Position.Top;
    node.sourcePosition = isHorizontal ? Position.Right : Position.Bottom;

    node.position = {
      x: nodeWithPosition.x - 220 / 2,
      y: nodeWithPosition.y - 100 / 2,
    };

    return node;
  });

  return { nodes, edges };
};

const initialNodes: Node[] = [
  { id: 'node-start', type: 'customNode', position: { x: 250, y: 50 }, data: { ...NODE_TYPES_CONFIG.start_node, nodeType: 'start_node' } },
  { id: 'node-end', type: 'customNode', position: { x: 250, y: 300 }, data: { ...NODE_TYPES_CONFIG.end_node, nodeType: 'end_node' } },
];

const initialEdges: Edge[] = [
  { id: 'e-start-end', source: 'node-start', target: 'node-end', type: 'customEdge' },
];

const testFlowNodes: Node[] = [
  { id: 'node-start', type: 'customNode', position: { x: 250, y: 50 }, data: { ...NODE_TYPES_CONFIG.start_node, nodeType: 'start_node', desc: '使用关联策略配置数据触发' } },
  { id: 'node-model', type: 'customNode', position: { x: 250, y: 200 }, data: { ...NODE_TYPES_CONFIG.action_model, nodeType: 'action_model' } },
  { id: 'node-http', type: 'customNode', position: { x: 250, y: 350 }, data: { ...NODE_TYPES_CONFIG.action_http, nodeType: 'action_http', title: '回调策略状态' } },
  { id: 'node-manual', type: 'customNode', position: { x: 250, y: 500 }, data: { ...NODE_TYPES_CONFIG.action_manual, nodeType: 'action_manual', title: '人工审批' } },
  { id: 'node-db', type: 'customNode', position: { x: 250, y: 650 }, data: { ...NODE_TYPES_CONFIG.action_db, nodeType: 'action_db' } },
  { id: 'node-kafka', type: 'customNode', position: { x: 250, y: 800 }, data: { ...NODE_TYPES_CONFIG.action_kafka, nodeType: 'action_kafka' } },
  { id: 'node-end', type: 'customNode', position: { x: 250, y: 950 }, data: { ...NODE_TYPES_CONFIG.end_node, nodeType: 'end_node' } },
];

const testFlowEdges: Edge[] = [
  { id: 'e-start-model', source: 'node-start', target: 'node-model', type: 'customEdge' },
  { id: 'e-model-http', source: 'node-model', target: 'node-http', type: 'customEdge' },
  { id: 'e-http-manual', source: 'node-http', target: 'node-manual', type: 'customEdge' },
  { id: 'e-manual-db', source: 'node-manual', target: 'node-db', type: 'customEdge' },
  { id: 'e-db-kafka', source: 'node-db', target: 'node-kafka', type: 'customEdge' },
  { id: 'e-kafka-end', source: 'node-kafka', target: 'node-end', type: 'customEdge' },
];

function FlowCanvasContent() {
  const { appId, flowId } = useParams()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const mode = searchParams.get('mode')
  
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)
  
  const [selectedNode, setSelectedNode] = useState<Node | null>(null)
  const [startTriggerType, setStartTriggerType] = useState<'api' | 'schedule' | 'event'>('api')
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [replaceNodeId, setReplaceNodeId] = useState<string | null>(null)
  const [viewTab, setViewTab] = useState<'canvas' | 'logs' | 'strategies'>('canvas')
  const [runLogs, setRunLogs] = useState<any[]>([])
  const [associatedStrategies, setAssociatedStrategies] = useState<any[]>([])
  const [isLoadingLogs, setIsLoadingLogs] = useState(false)
  const [flowName, setFlowName] = useState('表单审核流程')
  const [availableStrategies, setAvailableStrategies] = useState<any[]>([])
  const [selectedTestStrategyId, setSelectedTestStrategyId] = useState<string>("")
  
  // Test Run State
  const [isTestModalOpen, setIsTestModalOpen] = useState(false)
  const [isTesting, setIsTesting] = useState(false)
  const [testParams, setTestParams] = useState<Record<string, string>>({})
  const [testInput, setTestInput] = useState(JSON.stringify({
    requestId: "req_test_001",
    bizNo: "biz_test_001",
    name: "test-user",
    scoreBase: 60
  }, null, 2))
  const [testLogs, setTestLogs] = useState<Record<string, any> | null>(null)
  const [activeTab, setActiveTab] = useState<'config' | 'logs'>('config')

  useEffect(() => {
    if (isTestModalOpen) {
      // Fetch available strategies for selection
      const stored = localStorage.getItem('strategies');
      if (stored) {
        const allStrats = JSON.parse(stored);
        // Filter strategies that match this app/flow if possible, or just show all
        setAvailableStrategies(allStrats);
        if (allStrats.length > 0 && !selectedTestStrategyId) {
          setSelectedTestStrategyId(allStrats[0].id);
        }
      }

      const startNode = nodes.find(n => n.data.nodeType === 'start_node');
      if (startNode) {
        const defaultTemplate = JSON.stringify({
          requestId: "{{requestId}}",
          bizNo: "{{bizNo}}",
          name: "{{name}}",
          amount: "{{amount}}",
          mobile: "{{mobile}}",
          idCard: "{{idCard}}",
          scoreBase: "{{scoreBase}}"
        }, null, 2);
        
        const template = startNode.data.requestBodyTemplate || defaultTemplate;
        const matches = Array.from(template.matchAll(/{{(\w+)}}/g));
        
        if (matches.length > 0) {
          const params: Record<string, string> = {};
          const defaultValues: Record<string, string> = {
            requestId: `req_${Math.floor(Math.random() * 10000)}`,
            bizNo: `biz_${Math.floor(Math.random() * 10000)}`,
            name: "张三",
            amount: "50000",
            mobile: "13800138000",
            idCard: "110101199001011234",
            scoreBase: "60"
          };

          matches.forEach(match => {
            const key = match[1];
            if (!testParams[key]) {
              params[key] = defaultValues[key] || "";
            } else {
              params[key] = testParams[key];
            }
          });
          setTestParams(params);
        } else {
          setTestParams({});
        }
      }
    }
  }, [isTestModalOpen, nodes]);

  const updateNodeData = useCallback((nodeId: string, newData: any) => {
    setNodes((nds) =>
      nds.map((node) => {
        if (node.id === nodeId) {
          const updatedNode = {
            ...node,
            data: {
              ...node.data,
              ...newData,
            },
          };
          // Also update selectedNode if it's the one being edited to ensure UI sync
          setSelectedNode(prev => prev?.id === nodeId ? updatedNode : prev);
          return updatedNode;
        }
        return node;
      })
    );
  }, [setNodes]);

  const handleSave = async () => {
    setIsSaving(true)
    
    if (appId && flowId) {
      // Save nodes and edges to localStorage
      localStorage.setItem(`flow_data_${flowId}`, JSON.stringify({ nodes, edges }));
      
      // Update flow list updated time
      const storedFlows = localStorage.getItem(`flows_${appId}`);
      if (storedFlows) {
        let flows = JSON.parse(storedFlows);
        flows = flows.map((f: any) => {
          if (f.id === flowId) {
            return { ...f, updatedAt: new Date().toISOString().split('T')[0] };
          }
          return f;
        });
        localStorage.setItem(`flows_${appId}`, JSON.stringify(flows));
      }
    }

    await new Promise(resolve => setTimeout(resolve, 800))
    setIsSaving(false)
    toast.success("流程保存成功", {
      description: "您的修改已同步到云端服务器。"
    })
  }

  const handlePublish = async () => {
    setIsPublishing(true)
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (appId && flowId) {
      const storedFlows = localStorage.getItem(`flows_${appId}`);
      if (storedFlows) {
        let flows = JSON.parse(storedFlows);
        flows = flows.map((f: any) => {
          if (f.id === flowId) {
            let newVersion = "v1.0";
            if (f.version) {
              const match = f.version.match(/^v(\d+)\.(\d+)$/);
              if (match) {
                newVersion = `v${match[1]}.${parseInt(match[2], 10) + 1}`;
              }
            }
            return { ...f, status: 'published', version: newVersion };
          }
          return f;
        });
        localStorage.setItem(`flows_${appId}`, JSON.stringify(flows));
      }
    }

    setIsPublishing(false)
    setIsPublishModalOpen(false)
    setIsReadOnly(true)
    
    setNodes((nds) => nds.map(node => ({
      ...node,
      data: {
        ...node.data,
        readOnly: true,
        onDelete: undefined,
        onReplace: undefined
      }
    })));

    toast.success("流程发布成功", {
      description: "新版本已上线，正在生效中..."
    })
    
    // Navigate back to app detail page after publish
    setTimeout(() => {
      navigate(`/apps/${appId}`);
    }, 500);
  }

  const handleTestRun = async () => {
    let finalFormData: any;
    
    if (Object.keys(testParams).length > 0) {
      finalFormData = testParams;
    } else {
      try {
        finalFormData = JSON.parse(testInput);
      } catch (e) {
        toast.error("测试入参格式错误，请输入有效的 JSON");
        return;
      }
    }

    setIsTesting(true);
    setIsTestModalOpen(false);
    setTestLogs(null);
    setActiveTab('logs');
    
    // Clear previous execution statuses
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, executionStatus: undefined }
    })));
    
    toast.loading("正在试运行流程...", { id: 'test-run' });

    try {
      const response = await fetch(`/api/flow/start/${flowId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          strategyId: selectedTestStrategyId || "TEST_RUN",
          appId: appId,
          flowId: flowId,
          formData: finalFormData
        })
      });

      if (!response.ok) throw new Error('API request failed');
      
      const data = await response.json();
      
      if (data.logs) {
        setTestLogs(data.logs);
        
        // Visual Simulation
        const logKeys = Object.keys(data.logs);
        for (let i = 0; i < logKeys.length; i++) {
          const nodeId = logKeys[i];
          
          // Set to running
          updateNodeData(nodeId, { executionStatus: 'running' });
          await new Promise(r => setTimeout(r, 800)); // Simulate work
          
          // Set to success or suspended
          if (i === logKeys.length - 1 && data.status === 'suspended') {
            updateNodeData(nodeId, { executionStatus: 'suspended' });
          } else {
            updateNodeData(nodeId, { executionStatus: 'success' });
          }
        }
        
        if (data.status === 'completed' || data.status === 'success') {
          const endNode = nodes.find(n => n.data.nodeType === 'end_node');
          if (endNode) {
            updateNodeData(endNode.id, { executionStatus: 'success' });
          }
        }
      }
      
      if (data.status === 'suspended') {
        toast.success("流程已挂起，等待人工审批", { id: 'test-run' });
      } else {
        toast.success("试运行完成", { id: 'test-run' });
      }
    } catch (error) {
      toast.error("试运行失败", { id: 'test-run' });
    } finally {
      setIsTesting(false);
    }
  };
  
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition, fitView } = useReactFlow()

  const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge({ ...params, type: 'customEdge' }, eds)), [setEdges]);

  const onLayout = useCallback(
    (direction: string) => {
      const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(
        nodes,
        edges,
        direction
      );

      setNodes([...layoutedNodes]);
      setEdges([...layoutedEdges]);
      
      window.requestAnimationFrame(() => {
        fitView({ padding: 0.2 });
      });
    },
    [nodes, edges, setNodes, setEdges, fitView]
  );

  const handleDeleteNode = useCallback((id: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== id));
    setEdges((eds) => eds.filter((e) => e.source !== id && e.target !== id));
    setSelectedNode((prev) => prev?.id === id ? null : prev);
  }, [setNodes, setEdges]);

  const handleReplaceNode = useCallback((id: string) => {
    setReplaceNodeId(id);
  }, []);

  const confirmReplaceNode = (newType: string) => {
    if (!replaceNodeId) return;
    
    setNodes((nds) => nds.map(node => {
      if (node.id === replaceNodeId) {
        const config = NODE_TYPES_CONFIG[newType as keyof typeof NODE_TYPES_CONFIG];
        return {
          ...node,
          data: {
            ...node.data,
            ...config,
            nodeType: newType
          }
        };
      }
      return node;
    }));
    
    setReplaceNodeId(null);
  };

  const [runStatus, setRunStatus] = useState<'running' | 'suspended' | 'completed' | 'terminated' | null>(null);
  const [animatedRunId, setAnimatedRunId] = useState<string | null>(null);
  const runId = searchParams.get('runId');

  useEffect(() => {
    if (runId) {
      setViewTab('canvas');
    }
  }, [runId]);

  useEffect(() => {
    if (runId) {
      const fetchRunDetails = async () => {
        try {
          const res = await fetch(`/api/flow/run/${runId}`);
          if (res.ok) {
            const data = await res.json();
            setTestLogs(data.logs);
            setRunStatus(data.status);
            
            if (data.logs) {
              const logKeys = Object.keys(data.logs);
              
              if (animatedRunId !== runId) {
                setAnimatedRunId(runId);
                // Clear previous execution statuses
                setNodes(nds => nds.map(n => ({
                  ...n,
                  data: { ...n.data, executionStatus: undefined }
                })));

                // Visual Simulation
                for (let i = 0; i < logKeys.length; i++) {
                  const nodeId = logKeys[i];
                  
                  // Set to running
                  setNodes(nds => nds.map(node => 
                    node.id === nodeId ? { ...node, data: { ...node.data, executionStatus: 'running' } } : node
                  ));
                  
                  await new Promise(r => setTimeout(r, 800)); // Simulate work
                  
                  // Set to success or suspended/error
                  setNodes(nds => nds.map(node => {
                    if (node.id === nodeId) {
                      if (i === logKeys.length - 1 && data.status === 'suspended') {
                        return { ...node, data: { ...node.data, executionStatus: 'suspended' } };
                      }
                      if (i === logKeys.length - 1 && data.status === 'terminated') {
                        return { ...node, data: { ...node.data, executionStatus: 'error' } };
                      }
                      return { ...node, data: { ...node.data, executionStatus: 'success' } };
                    }
                    return node;
                  }));
                }

                // Highlight end node if completed
                if (data.status === 'completed' || data.status === 'success') {
                  const endNode = nodes.find(n => n.data.nodeType === 'end_node');
                  if (endNode) {
                    setNodes(nds => nds.map(node => 
                      node.id === endNode.id ? { ...node, data: { ...node.data, executionStatus: 'success' } } : node
                    ));
                  }
                }
              } else {
                // Just update statuses without animation if already animated
                setNodes(nds => nds.map(node => {
                  if (data.logs[node.id]) {
                    if (node.id === logKeys[logKeys.length - 1] && data.status === 'suspended') {
                      return { ...node, data: { ...node.data, executionStatus: 'suspended' } };
                    }
                    if (node.id === logKeys[logKeys.length - 1] && data.status === 'terminated') {
                      return { ...node, data: { ...node.data, executionStatus: 'error' } };
                    }
                    return { ...node, data: { ...node.data, executionStatus: 'success' } };
                  }
                  
                  // Handle end node
                  if (node.data.nodeType === 'end_node' && (data.status === 'completed' || data.status === 'success')) {
                    return { ...node, data: { ...node.data, executionStatus: 'success' } };
                  }

                  return { ...node, data: { ...node.data, executionStatus: undefined } };
                }));
              }
            }
          } else {
            const errData = await res.json();
            toast.error(`无法获取执行轨迹: ${errData.message || '未知错误'}`);
            setRunStatus('terminated');
          }
        } catch (e) {
          console.error("Failed to fetch run details:", e);
        }
      };

      fetchRunDetails();
      
      let interval: any;
      if (runStatus === 'running' || runStatus === 'suspended') {
        interval = setInterval(fetchRunDetails, 3000);
      }
      return () => clearInterval(interval);
    }
  }, [runId, runStatus, setNodes, animatedRunId]);

  // Initialize flow data when flowId changes
  React.useEffect(() => {
    let published = false;
    if (appId && flowId) {
      const storedFlows = localStorage.getItem(`flows_${appId}`);
      if (storedFlows) {
        const flows = JSON.parse(storedFlows);
        const currentFlow = flows.find((f: any) => f.id === flowId);
        if (currentFlow) {
          setFlowName(currentFlow.name);
          if (currentFlow.status === 'published') {
            published = true;
          }
        }
      } else if (flowId === 'flow-1') {
        // Fallback for initial mock data if localStorage is empty
        published = true;
      }
    }
    
    if (mode === 'view') {
      published = true;
    }
    
    setIsReadOnly(published);

    const storedData = localStorage.getItem(`flow_data_${flowId}`);
    let targetNodes = flowId === 'flow-test' ? testFlowNodes : initialNodes;
    let targetEdges = flowId === 'flow-test' ? testFlowEdges : initialEdges;

    if (storedData) {
      const parsed = JSON.parse(storedData);
      targetNodes = parsed.nodes;
      targetEdges = parsed.edges;
    }

    setNodes(targetNodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        onDelete: published ? undefined : handleDeleteNode,
        onReplace: published ? undefined : handleReplaceNode,
        readOnly: published
      }
    })));
    setEdges(targetEdges);
    
    setTimeout(() => {
      fitView({ padding: 0.2 });
    }, 50);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appId, flowId, mode]);

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'all';
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'none';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      // Dropping on canvas is disabled. Nodes must be dropped on edges.
    },
    []
  );

  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    if (node.data.nodeType === 'end_node') return;
    setSelectedNode(node);
    if (testLogs && testLogs[node.id]) {
      setActiveTab('logs');
    } else {
      setActiveTab('config');
    }
  }, [testLogs]);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // Fetch real logs and strategies
  useEffect(() => {
    if (viewTab === 'logs' || viewTab === 'strategies') {
      const fetchData = async () => {
        setIsLoadingLogs(true);
        try {
          // Fetch results from backend
          const res = await fetch('/api/flow/results');
          const results = await res.json();
          
          // Get strategies from localStorage
          const storedStrategies = JSON.parse(localStorage.getItem('strategies') || '[]');
          
          // Filter results for this flow
          const filteredResults = results.map((r: any) => {
            const strategy = storedStrategies.find((s: any) => s.runId === r.run_id || s.id === r.request_id);
            let status = r.total_score > 60 ? "success" : "failed";
            
            if (r.is_suspended) {
              status = 'suspended';
            } else if (r.logs) {
              try {
                const parsedLogs = typeof r.logs === 'string' ? JSON.parse(r.logs) : r.logs;
                const lastNode = Object.values(parsedLogs).pop() as any;
                if (lastNode?.output?.status === 'rejected') status = 'failed';
                else if (lastNode?.output?.status === 'approved') status = 'success';
              } catch (e) {}
            }
            
            return {
              id: r.run_id,
              strategyName: strategy ? strategy.name : r.name || "未知策略",
              status: status,
              startTime: r.created_at,
              duration: "1.2s",
              strategyId: strategy?.id || r.request_id,
              isDeleted: !strategy
            };
          });

          setRunLogs(filteredResults);

          // Filter strategies for this flow
          const flowStrategies = storedStrategies.filter((s: any) => s.flowId === flowId).map((s: any) => ({ ...s, isDeleted: false }));
          
          // Also include strategies from logs that are missing from storedStrategies
          const deletedStrategiesFromLogs = filteredResults
            .filter(r => r.isDeleted)
            .map(r => ({
              id: r.strategyId,
              name: r.strategyName,
              creator: "admin",
              status: "deleted",
              isDeleted: true
            }));

          const allAssociated = [...flowStrategies];
          deletedStrategiesFromLogs.forEach(ds => {
            if (!allAssociated.some(s => s.id === ds.id)) {
              allAssociated.push(ds);
            }
          });

          setAssociatedStrategies(allAssociated);
        } catch (error) {
          console.error("Failed to fetch logs:", error);
        } finally {
          setIsLoadingLogs(false);
        }
      };
      fetchData();
    }
  }, [viewTab, flowId]);

  return (
    <div className="flex flex-col h-screen bg-bg-main">
      {/* Canvas Toolbar */}
      <div className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0 z-10 relative shadow-sm">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate(`/apps/${appId}`)}
            className="flex items-center px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
          >
            <ChevronLeft className="w-4 h-4 mr-1" />
            返回
          </button>
          <div className="h-4 w-px bg-gray-200 mx-1" />
          <div className="flex items-center text-sm text-gray-500">
            <span className="font-bold text-gray-900">{flowName}</span>
            {isReadOnly ? (
              <span className="ml-2 px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-100">
                已发布 (只读)
              </span>
            ) : (
              <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] font-bold rounded border border-gray-200 uppercase tracking-wider">
                草稿
              </span>
            )}
            
            {runId ? (
              <div className={cn(
                "ml-4 px-3 py-1 rounded-full border flex items-center gap-2 text-[11px] font-medium transition-all animate-in fade-in slide-in-from-left-2",
                runStatus === 'running' ? "bg-blue-50 text-blue-600 border-blue-100" :
                runStatus === 'suspended' ? "bg-amber-50 text-amber-600 border-amber-100" :
                runStatus === 'completed' ? "bg-emerald-50 text-emerald-600 border-emerald-100" :
                runStatus === 'terminated' ? "bg-red-50 text-red-600 border-red-100" :
                "bg-gray-50 text-gray-500 border-gray-200"
              )}>
                {runStatus === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                {runStatus === 'suspended' && <Clock className="w-3 h-3" />}
                {runStatus === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                {runStatus === 'terminated' && <AlertCircle className="w-3 h-3" />}
                
                <span className="text-gray-600">
                  策略 <span className="font-bold text-gray-900">{(JSON.parse(localStorage.getItem('strategies') || '[]').find((s: any) => s.runId === runId)?.name) || "未知策略"}</span> 
                  的运行实例 <span className="font-mono font-bold text-brand">{runId}</span> 
                  {runStatus === 'running' ? " 正在执行中..." : 
                   runStatus === 'suspended' ? " 已挂起，等待人工审批" : 
                   runStatus === 'completed' ? " 已成功完成" : 
                   runStatus === 'terminated' ? " 已终止/被拒绝" : " 状态未知"}
                </span>
              </div>
            ) : (
              isTesting && (
                <span className="ml-2 px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase tracking-wider border border-blue-100 flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  本地试运行中
                </span>
              )
            )}
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200"
            onClick={() => onLayout('TB')}
          >
            <LayoutTemplate className="w-4 h-4" />
            自动布局
          </button>
          {isReadOnly ? (
            <button 
              className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200"
              onClick={() => setIsReadOnly(false)}
            >
              <Edit3 className="w-4 h-4" />
              进入编辑模式
            </button>
          ) : (
            <>
              <button 
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-blue-200",
                  isTesting && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => setIsTestModalOpen(true)}
                disabled={isTesting}
              >
                <Play className={cn("w-4 h-4", isTesting && "animate-pulse")} />
                {isTesting ? "试运行中..." : "试运行"}
              </button>
              <button 
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg transition-colors border border-gray-200",
                  isSaving && "opacity-50 cursor-not-allowed"
                )}
                onClick={handleSave}
                disabled={isSaving}
              >
                <Save className={cn("w-4 h-4", isSaving && "animate-spin")} />
                {isSaving ? "保存中..." : "保存"}
              </button>
              <button 
                className="btn-primary px-4 py-1.5 text-sm"
                onClick={() => setIsPublishModalOpen(true)}
              >
                <Play className="w-4 h-4" />
                发布上线
              </button>
            </>
          )}
        </div>
      </div>

      {mode === 'view' && (
        <div className="h-12 bg-white border-b border-gray-200 px-6 flex items-center space-x-6 shrink-0">
          <button 
            onClick={() => setViewTab('canvas')} 
            className={cn("h-full border-b-2 font-medium text-sm transition-colors", viewTab === 'canvas' ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-900")}
          >
            流程画布
          </button>
          <button 
            onClick={() => setViewTab('logs')} 
            className={cn("h-full border-b-2 font-medium text-sm transition-colors", viewTab === 'logs' ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-900")}
          >
            运行日志
          </button>
          <button 
            onClick={() => setViewTab('strategies')} 
            className={cn("h-full border-b-2 font-medium text-sm transition-colors", viewTab === 'strategies' ? "border-brand text-brand" : "border-transparent text-gray-500 hover:text-gray-900")}
          >
            关联策略
          </button>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar - Node Library */}
        {!isReadOnly && viewTab === 'canvas' && (
          <div className="w-64 bg-white border-r border-gray-200 flex flex-col shrink-0 z-10 relative shadow-sm">
            <div className="p-5 space-y-6 overflow-y-auto h-full">
              <div>
                <div className="text-[10px] font-bold text-gray-400 mb-3 uppercase tracking-widest">Decision Nodes</div>
                <div className="space-y-2.5">
                  {Object.entries(NODE_TYPES_CONFIG)
                    .filter(([key]) => key !== 'start_node' && key !== 'end_node')
                    .map(([key, config]) => {
                      const Icon = config.icon
                      return (
                        <div 
                          key={key}
                          className="flex items-center p-3 rounded-xl border border-gray-100 hover:border-brand hover:shadow-md cursor-grab bg-white transition-all group"
                          onDragStart={(e) => onDragStart(e, key)}
                          draggable
                        >
                          <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mr-3 text-white shadow-sm", config.color)}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-bold text-gray-900">{config.title}</p>
                            <p className="text-[10px] text-gray-400 line-clamp-1">{config.desc}</p>
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
              
              <div className="bg-brand/5 border border-brand/10 p-4 rounded-xl">
                <p className="text-xs text-gray-600 leading-relaxed">
                  <span className="font-bold text-gray-900 block mb-1">使用提示</span>
                  将节点拖拽到画布中的连线上即可自动插入。
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Canvas Area */}
        <div className={cn("flex-1 h-full relative", viewTab === 'canvas' ? 'block' : 'hidden')} ref={reactFlowWrapper}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={isReadOnly ? undefined : onNodesChange}
            onEdgesChange={isReadOnly ? undefined : onEdgesChange}
            onConnect={isReadOnly ? undefined : onConnect}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            onDragOver={isReadOnly ? undefined : onDragOver}
            onDrop={isReadOnly ? undefined : onDrop}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            panOnDrag={true}
            selectionOnDrag={false}
            fitView
            className="bg-[#f8f9fa]"
            nodesDraggable={!isReadOnly}
            nodesConnectable={!isReadOnly}
            elementsSelectable={true}
          >
            <Background color="#ccc" gap={16} />
            <Controls />
          </ReactFlow>
        </div>

        {viewTab === 'logs' && (
          <div className="flex-1 h-full overflow-y-auto bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6">运行日志</h2>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">运行 ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">关联策略</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">触发时间</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">耗时</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoadingLogs ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          正在加载运行日志...
                        </td>
                      </tr>
                    ) : runLogs.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                          暂无运行记录
                        </td>
                      </tr>
                    ) : (
                      runLogs.map(run => (
                        <tr key={run.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900">{run.id}</td>
                          <td className="px-6 py-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              {run.strategyName}
                              {run.isDeleted && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                  已删除
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {run.status === 'success' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">执行成功</span>}
                            {run.status === 'suspended' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">挂起中</span>}
                            {run.status === 'failed' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">执行失败</span>}
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500">{run.startTime}</td>
                          <td className="px-6 py-4 text-sm text-gray-500">{run.duration}</td>
                          <td className="px-6 py-4 text-right space-x-3">
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors" onClick={() => navigate(`/apps/${appId}/flows/${flowId}?runId=${run.id}&mode=view`)}>查看轨迹</button>
                            <button className="text-brand hover:text-brand-hover text-sm font-medium transition-colors" onClick={() => navigate(`/strategies/${run.strategyId}`)}>查看策略</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {viewTab === 'strategies' && (
          <div className="flex-1 h-full overflow-y-auto bg-gray-50 p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-xl font-bold text-gray-900 mb-6">关联策略申请</h2>
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">策略 ID</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">策略名称</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">创建人</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">状态</th>
                      <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {isLoadingLogs ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                          正在加载关联策略...
                        </td>
                      </tr>
                    ) : associatedStrategies.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                          暂无关联策略
                        </td>
                      </tr>
                    ) : (
                      associatedStrategies.map(st => (
                        <tr key={st.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono text-xs font-bold text-gray-900">{st.id}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              {st.name}
                              {st.isDeleted && (
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                  已删除
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-600">
                                {(st.creator || "a")[0].toUpperCase()}
                              </div>
                              <span className="text-sm text-gray-600">{st.creator || "admin"}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            {st.isDeleted ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">已删除</span>
                            ) : (
                              <>
                                {st.status === 'pending_approval' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">待审批</span>}
                                {st.status === 'approved' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">已通过</span>}
                                {st.status === 'processing' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">决策中</span>}
                                {st.status === 'rejected' && <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">已拒绝</span>}
                              </>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right space-x-3">
                            <button className="text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors" onClick={() => navigate(`/apps/${appId}/flows/${flowId}?runId=${st.runId || st.id}&mode=view`)}>查看轨迹</button>
                            <button className="text-brand hover:text-brand-hover text-sm font-medium transition-colors" onClick={() => navigate(`/strategies/${st.id}`)}>查看详情</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Node Config Drawer */}
      <Drawer
        isOpen={!!selectedNode}
        onClose={() => setSelectedNode(null)}
        title={selectedNode ? NODE_TYPES_CONFIG[selectedNode.data.nodeType as keyof typeof NODE_TYPES_CONFIG]?.title || "节点配置" : "节点配置"}
        hasBackdrop={false}
        footer={
          <>
            <Button variant="outline" onClick={() => setSelectedNode(null)}>
              {isReadOnly ? "关闭" : "取消"}
            </Button>
            {!isReadOnly && <Button onClick={() => setSelectedNode(null)}>保存</Button>}
          </>
        }
      >
        {selectedNode && (
          <div className="flex flex-col h-full">
            {testLogs && testLogs[selectedNode.id] && (
              <div className="flex items-center border-b border-gray-200 mb-4 shrink-0">
                <button 
                  onClick={() => setActiveTab('config')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'config' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  节点配置
                </button>
                <button 
                  onClick={() => setActiveTab('logs')}
                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'logs' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                >
                  运行日志
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto">
              {activeTab === 'logs' && testLogs && testLogs[selectedNode.id] ? (
                <div className="space-y-4">
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">输入参数 (Input)</h4>
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-800 overflow-x-auto">
                      {JSON.stringify(testLogs[selectedNode.id].input, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">输出结果 (Output)</h4>
                    <pre className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs font-mono text-gray-800 overflow-x-auto">
                      {JSON.stringify(testLogs[selectedNode.id].output, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedNode.data.nodeType === 'start_node' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">节点类型</label>
                        <div className="text-sm text-gray-900 font-medium">开始节点</div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">节点名称</label>
                        <input type="text" readOnly value="开始" className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500 text-sm" />
                      </div>
                      <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm">
                        说明: 系统默认起点，不可删除，不可替换。
                      </div>
                    </div>
                  )}

            {selectedNode.data.nodeType === 'end_node' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">节点类型</label>
                  <div className="text-sm text-gray-900 font-medium">结束节点</div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">节点名称</label>
                  <input type="text" readOnly value="结束" className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-500 text-sm" />
                </div>
                <div className="bg-blue-50 text-blue-800 p-3 rounded-md text-sm">
                  说明: 系统默认终点，不可删除，不可替换。
                </div>
              </div>
            )}

            {selectedNode.data.nodeType === 'trigger_webhook' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">节点名称</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.title || "Webhook API 触发"} 
                    onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">请求方式</label>
                  <select 
                    value={selectedNode.data.method || "POST"}
                    onChange={(e) => updateNodeData(selectedNode.id, { method: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option>POST</option>
                    <option>GET</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Endpoint</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.endpoint || "/api/flow/webhook/trigger"} 
                    onChange={(e) => updateNodeData(selectedNode.id, { endpoint: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content-Type</label>
                  <select 
                    value={selectedNode.data.contentType || "application/json"}
                    onChange={(e) => updateNodeData(selectedNode.id, { contentType: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option>application/json</option>
                    <option>application/x-www-form-urlencoded</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">鉴权方式</label>
                  <select 
                    value={selectedNode.data.authType || "无鉴权"}
                    onChange={(e) => updateNodeData(selectedNode.id, { authType: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option>无鉴权</option>
                    <option>Bearer Token</option>
                    <option>Basic Auth</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">输入 Schema</label>
                  <textarea 
                    rows={6} 
                    value={selectedNode.data.schema || '{\n  "formId": "string",\n  "userId": "string",\n  "strategyData": {}\n}'} 
                    onChange={(e) => updateNodeData(selectedNode.id, { schema: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
              </div>
            )}

            {selectedNode.data.nodeType === 'start_node' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">触发类型</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => !isReadOnly && setStartTriggerType('api')}
                      className={cn(
                        "px-3 py-2 text-xs font-medium rounded-md border transition-colors",
                        startTriggerType === 'api' ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50",
                        isReadOnly && "cursor-default"
                      )}
                    >
                      API 触发
                    </button>
                    <button 
                      onClick={() => !isReadOnly && setStartTriggerType('schedule')}
                      className={cn(
                        "px-3 py-2 text-xs font-medium rounded-md border transition-colors",
                        startTriggerType === 'schedule' ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50",
                        isReadOnly && "cursor-default"
                      )}
                    >
                      定时触发
                    </button>
                    <button 
                      onClick={() => !isReadOnly && setStartTriggerType('event')}
                      className={cn(
                        "px-3 py-2 text-xs font-medium rounded-md border transition-colors",
                        startTriggerType === 'event' ? "bg-blue-50 border-blue-500 text-blue-700" : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50",
                        isReadOnly && "cursor-default"
                      )}
                    >
                      事件触发
                    </button>
                  </div>
                </div>

                {startTriggerType === 'api' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Webhook URL</label>
                      <div className="flex gap-2">
                        <input type="text" readOnly value="https://flow.ais.com/hook/v1/782910" className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 font-mono" />
                        <Button variant="outline" size="sm">复制</Button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">请求方法</label>
                      <select 
                        disabled={isReadOnly}
                        value={selectedNode.data.apiMethod || "POST (推荐)"}
                        onChange={(e) => updateNodeData(selectedNode.id, { apiMethod: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option>POST (推荐)</option>
                        <option>GET</option>
                        <option>PUT</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">认证方式</label>
                      <select 
                        disabled={isReadOnly}
                        value={selectedNode.data.apiAuth || "无认证"}
                        onChange={(e) => updateNodeData(selectedNode.id, { apiAuth: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option>无认证</option>
                        <option>API Key (Header)</option>
                        <option>Bearer Token</option>
                      </select>
                    </div>
                    {flowId === 'flow-test' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">请求体模板 (JSON)</label>
                          <p className="text-[10px] text-gray-500 mb-2">使用 {"{{变量名}}"} 引用策略申请时的业务字段</p>
                          <textarea 
                            disabled={isReadOnly}
                            rows={6} 
                            value={selectedNode.data.requestBodyTemplate || JSON.stringify({
                              requestId: "{{requestId}}",
                              bizNo: "{{bizNo}}",
                              name: "{{name}}",
                              amount: "{{amount}}",
                              mobile: "{{mobile}}",
                              idCard: "{{idCard}}",
                              scoreBase: "{{scoreBase}}"
                            }, null, 2)} 
                            onChange={(e) => updateNodeData(selectedNode.id, { requestBodyTemplate: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono disabled:bg-gray-50 disabled:text-gray-500" 
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">测试示例数据 (业务字段)</label>
                          <textarea 
                            readOnly 
                            rows={6} 
                            value={JSON.stringify({
                              requestId: "req_001",
                              bizNo: "biz_001",
                              name: "张三",
                              amount: "50000",
                              mobile: "13800138000",
                              idCard: "110101199001011234",
                              scoreBase: 60
                            }, null, 2)} 
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 font-mono resize-none" 
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                {startTriggerType === 'schedule' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">执行周期</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                        <option>每小时</option>
                        <option>每天</option>
                        <option>每周</option>
                        <option>自定义 Cron</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cron 表达式</label>
                      <input type="text" defaultValue="0 0 * * *" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono" />
                      <p className="text-[10px] text-gray-400 mt-1">提示：0 0 * * * 表示每天凌晨 0 点执行</p>
                    </div>
                  </div>
                )}

                {startTriggerType === 'event' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">事件源</label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                        <option>Kafka</option>
                        <option>RocketMQ</option>
                        <option>Redis Pub/Sub</option>
                        <option>文件系统监听</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Topic / 路径</label>
                      <input type="text" placeholder="请输入监听标识" className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm" />
                    </div>
                  </div>
                )}
              </div>
            )}

            {selectedNode.data.nodeType === 'action_model' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">节点名称</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.title || (flowId === 'flow-test' ? "Mock 模型调用" : "风险评分 model 调用")} 
                    onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                {flowId === 'flow-test' ? (
                  <div className="bg-blue-50 border border-blue-100 p-3 rounded-md text-sm text-blue-700">
                    <p className="font-bold mb-1">Mock 规则配置</p>
                    <ul className="list-disc pl-4 space-y-1 text-xs">
                      <li>使用开始组件 API 的输入作为模型入参</li>
                      <li>自动生成 4 个随机整数 (0-100)</li>
                      <li>生成 totalScore 字段 (4 个随机数之和)</li>
                    </ul>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">模型版本</label>
                      <select 
                        value={selectedNode.data.modelVersion || "风险评分模型 v3.1"}
                        onChange={(e) => updateNodeData(selectedNode.id, { modelVersion: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                      >
                        <option>风险评分模型 v3.1</option>
                        <option>风险评分模型 v4.0</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">服务地址</label>
                      <input 
                        type="text" 
                        value={selectedNode.data.serviceUrl || "model-service/risk-score"} 
                        onChange={(e) => updateNodeData(selectedNode.id, { serviceUrl: e.target.value })}
                        disabled={isReadOnly}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">超时时间 (秒)</label>
                        <input 
                          type="number" 
                          value={selectedNode.data.timeout || 5} 
                          onChange={(e) => updateNodeData(selectedNode.id, { timeout: parseInt(e.target.value) })}
                          disabled={isReadOnly}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">重试次数</label>
                        <input 
                          type="number" 
                          value={selectedNode.data.retries || 0} 
                          onChange={(e) => updateNodeData(selectedNode.id, { retries: parseInt(e.target.value) })}
                          disabled={isReadOnly}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                        />
                      </div>
                    </div>
                  </>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">入参映射</label>
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 font-medium text-gray-700">模型参数</th>
                          <th className="px-3 py-2 font-medium text-gray-700">来源字段</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {flowId === 'flow-test' ? (
                          <>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">requestId</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.requestId</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">bizNo</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.bizNo</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">name</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.name</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">scoreBase</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.scoreBase</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">strategyConfig</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.strategyConfig</td>
                            </tr>
                          </>
                        ) : (
                          <>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">user_profile</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.trigger.data.userProfile</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">amount</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.trigger.data.amount</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">strategy_raw</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.trigger.data.strategyData</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">输出字段</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.outputFields || (flowId === 'flow-test' ? "randomA, randomB, randomC, randomD, totalScore" : "score, suggestion, reason")} 
                    onChange={(e) => updateNodeData(selectedNode.id, { outputFields: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                {!isReadOnly && (
                  <div className="pt-2">
                    <Button variant="outline" className="w-full">测试调用</Button>
                  </div>
                )}
              </div>
            )}

            {selectedNode.data.nodeType === 'action_db' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">节点名称</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.title || (flowId === 'flow-test' ? "写入 SQLite" : "结果持久化")} 
                    onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">数据源</label>
                  <select 
                    value={selectedNode.data.dataSource || (flowId === 'flow-test' ? "SQLite (Local)" : "risk_db_prod")}
                    onChange={(e) => updateNodeData(selectedNode.id, { dataSource: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    {flowId === 'flow-test' ? (
                      <option>SQLite (Local)</option>
                    ) : (
                      <>
                        <option>risk_db_prod</option>
                        <option>risk_db_test</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">操作类型</label>
                  <select 
                    value={selectedNode.data.opType || "INSERT"}
                    onChange={(e) => updateNodeData(selectedNode.id, { opType: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option>INSERT</option>
                    <option>UPDATE</option>
                    <option>UPSERT</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">表名</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.tableName || (flowId === 'flow-test' ? "mock_flow_results" : "strategy_result")} 
                    onChange={(e) => updateNodeData(selectedNode.id, { tableName: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">字段映射</label>
                  <div className="border border-gray-200 rounded-md overflow-hidden">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 border-b border-gray-200">
                        <tr>
                          <th className="px-3 py-2 font-medium text-gray-700">表字段</th>
                          <th className="px-3 py-2 font-medium text-gray-700">来源字段</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {flowId === 'flow-test' ? (
                          <>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">run_id</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.system.runId</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">request_id</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.requestId</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">biz_no</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.bizNo</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">name</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.name</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">amount</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.amount</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">mobile</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.mobile</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">id_card</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.idCard</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">random_a</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.model.randomA</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">random_b</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.model.randomB</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">random_c</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.model.randomC</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">random_d</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.model.randomD</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">total_score</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.model.totalScore</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">strategy_id</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.start.strategyConfig.strategyId</td>
                            </tr>
                          </>
                        ) : (
                          <>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">form_id</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.trigger.data.formId</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">run_id</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.system.runId</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">model_score</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.model.score</td>
                            </tr>
                            <tr>
                              <td className="px-3 py-2 font-mono text-xs">suggestion</td>
                              <td className="px-3 py-2 font-mono text-xs text-blue-600">$.model.suggestion</td>
                            </tr>
                          </>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">失败策略</label>
                  <select 
                    value={selectedNode.data.failStrategy || "终止流程"}
                    onChange={(e) => updateNodeData(selectedNode.id, { failStrategy: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option>终止流程</option>
                    <option>忽略并继续</option>
                  </select>
                </div>
              </div>
            )}

            {selectedNode.data.nodeType === 'action_http' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">节点名称</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.title || "前端结果通知"} 
                    onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">请求地址</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.url || "https://api.xxx.com/form/callback"} 
                    onChange={(e) => updateNodeData(selectedNode.id, { url: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">请求方式</label>
                    <select 
                      value={selectedNode.data.method || "POST"}
                      onChange={(e) => updateNodeData(selectedNode.id, { method: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option>POST</option>
                      <option>GET</option>
                      <option>PUT</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Content-Type</label>
                    <select 
                      value={selectedNode.data.contentType || "application/json"}
                      onChange={(e) => updateNodeData(selectedNode.id, { contentType: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option>application/json</option>
                      <option>application/x-www-form-urlencoded</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">成功状态码</label>
                    <input 
                      type="text" 
                      value={selectedNode.data.successCode || "200"} 
                      onChange={(e) => updateNodeData(selectedNode.id, { successCode: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">超时时间 (秒)</label>
                    <input 
                      type="number" 
                      value={selectedNode.data.timeout || 30} 
                      onChange={(e) => updateNodeData(selectedNode.id, { timeout: parseInt(e.target.value) })}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">超时自动处理策略</label>
                  <select 
                    value={selectedNode.data.timeoutPolicy || "标记为成功并继续"}
                    onChange={(e) => updateNodeData(selectedNode.id, { timeoutPolicy: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option>标记为成功并继续</option>
                    <option>标记为失败并终止</option>
                    <option>自动重试 (最多3次)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Body 模板</label>
                  <textarea 
                    rows={6} 
                    value={selectedNode.data.bodyTemplate || '{\n  "formId": "$.trigger.data.formId",\n  "status": "processed",\n  "runId": "$.system.runId",\n  "modelScore": "$.model.score"\n}'} 
                    onChange={(e) => updateNodeData(selectedNode.id, { bodyTemplate: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                {!isReadOnly && (
                  <div className="pt-2">
                    <Button variant="outline" className="w-full">发送测试</Button>
                  </div>
                )}
              </div>
            )}

            {selectedNode.data.nodeType === 'action_manual' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">节点名称</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.title || "人工确认"} 
                    onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">回调标识</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.callbackKey || "review_callback_key"} 
                    onChange={(e) => updateNodeData(selectedNode.id, { callbackKey: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">外部回调地址</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.callbackUrl || "/api/flow/review/callback"} 
                    onChange={(e) => updateNodeData(selectedNode.id, { callbackUrl: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">超时时间 (小时)</label>
                    <input 
                      type="number" 
                      value={selectedNode.data.timeoutHours || 24} 
                      onChange={(e) => updateNodeData(selectedNode.id, { timeoutHours: parseInt(e.target.value) })}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">超时策略</label>
                    <select 
                      value={selectedNode.data.timeoutPolicy || "终止流程"}
                      onChange={(e) => updateNodeData(selectedNode.id, { timeoutPolicy: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option>终止流程</option>
                      <option>自动通过</option>
                      <option>自动拒绝</option>
                    </select>
                  </div>
                </div>
                <div className="bg-amber-50 border border-amber-200 p-3 rounded-md">
                  <p className="text-sm text-amber-800">
                    <strong>说明：</strong> 流程运行到该节点后进入挂起状态，等待外部业务系统完成 review 并通过回调接口通知平台继续执行。
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">恢复条件</label>
                  <select 
                    value={selectedNode.data.resumeCondition || "审批通过回调"}
                    onChange={(e) => updateNodeData(selectedNode.id, { resumeCondition: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                  >
                    <option>审批通过回调</option>
                    <option>任意回调</option>
                  </select>
                </div>
              </div>
            )}

            {selectedNode.data.nodeType === 'action_kafka' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">节点名称</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.title || "Kafka下发"} 
                    onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Broker 地址</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.broker || "kafka://10.0.0.1:9092"} 
                    onChange={(e) => updateNodeData(selectedNode.id, { broker: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
                  <input 
                    type="text" 
                    value={selectedNode.data.topic || "strategy_final_result"} 
                    onChange={(e) => updateNodeData(selectedNode.id, { topic: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">消息 Key</label>
                    <input 
                      type="text" 
                      value={selectedNode.data.messageKey || "$.trigger.data.formId"} 
                      onChange={(e) => updateNodeData(selectedNode.id, { messageKey: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500" 
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">发送方式</label>
                    <select 
                      value={selectedNode.data.sendMode || "异步"}
                      onChange={(e) => updateNodeData(selectedNode.id, { sendMode: e.target.value })}
                      disabled={isReadOnly}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm disabled:bg-gray-50 disabled:text-gray-500"
                    >
                      <option>异步</option>
                      <option>同步</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">消息体模板</label>
                  <textarea 
                    rows={6} 
                    value={selectedNode.data.messageTemplate || '{\n  "formId": "$.trigger.data.formId",\n  "rawInput": "$.trigger.data",\n  "modelResult": "$.model",\n  "reviewResult": "$.review",\n  "runId": "$.system.runId"\n}'} 
                    onChange={(e) => updateNodeData(selectedNode.id, { messageTemplate: e.target.value })}
                    disabled={isReadOnly}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono disabled:bg-gray-50 disabled:text-gray-500" 
                  />
                </div>
                {!isReadOnly && (
                  <div className="pt-2">
                    <Button variant="outline" className="w-full">发送测试</Button>
                  </div>
                )}
              </div>
            )}
                </div>
              )}
            </div>
          </div>
        )}
      </Drawer>

      {/* Test Run Modal */}
      <Modal
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        title="流程试运行"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsTestModalOpen(false)}>取消</Button>
            <button 
              onClick={handleTestRun} 
              className={cn("btn-primary px-6", isTesting && "opacity-50 cursor-not-allowed")}
              disabled={isTesting}
            >
              {isTesting ? "运行中..." : "开始测试"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl">
            <p className="text-sm text-blue-800 leading-relaxed">
              试运行将使用下方输入的参数触发当前流程。测试结果不会影响线上统计，但<strong>会真实执行节点逻辑</strong>（如写入测试库）。
            </p>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">关联策略 (模拟触发源)</label>
            <select 
              value={selectedTestStrategyId}
              onChange={(e) => setSelectedTestStrategyId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
            >
              <option value="TEST_RUN">默认测试策略 (ST-TEST-001)</option>
              {availableStrategies.map(s => (
                <option key={s.id} value={s.id}>{s.id} ({s.name})</option>
              ))}
            </select>
          </div>
          
          {Object.keys(testParams).length > 0 ? (
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
              <div className="text-sm font-bold text-gray-900 mb-2">业务参数配置</div>
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(testParams).map(([key, value]) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-gray-500 mb-1">{key}</label>
                    <input 
                      type="text"
                      value={value}
                      onChange={(e) => setTestParams(prev => ({ ...prev, [key]: e.target.value }))}
                      placeholder={`请输入 ${key}`}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                    />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-1.5">测试入参 (JSON)</label>
              <textarea 
                value={testInput}
                onChange={(e) => setTestInput(e.target.value)}
                rows={8}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none text-sm font-mono bg-gray-50"
              />
            </div>
          )}
        </div>
      </Modal>

      {/* Replace Node Modal */}
      <Modal
        isOpen={!!replaceNodeId}
        onClose={() => setReplaceNodeId(null)}
        title="替换节点"
      >
        <div className="grid grid-cols-2 gap-4">
          {Object.entries(NODE_TYPES_CONFIG)
            .filter(([key]) => key !== 'start_node' && key !== 'end_node')
            .map(([key, config]) => {
            const Icon = config.icon;
            return (
              <div 
                key={key}
                onClick={() => confirmReplaceNode(key)}
                className="flex items-center p-4 rounded-xl border border-gray-100 hover:border-brand hover:bg-brand/5 cursor-pointer transition-all group"
              >
                <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center shrink-0 text-white mr-4 shadow-sm", config.color)}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-gray-900">{config.title}</p>
                  <p className="text-[10px] text-gray-400 line-clamp-1">{config.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Modal>

      {/* Publish Modal */}
      <Modal
        isOpen={isPublishModalOpen}
        onClose={() => setIsPublishModalOpen(false)}
        title="发布流程"
        footer={
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setIsPublishModalOpen(false)}>取消</Button>
            <button 
              onClick={handlePublish} 
              className={cn("btn-primary px-6", isPublishing && "opacity-50 cursor-not-allowed")}
              disabled={isPublishing}
            >
              {isPublishing ? "发布中..." : "确认发布"}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="p-4 bg-brand/5 border border-brand/10 rounded-xl">
            <p className="text-sm text-gray-700 leading-relaxed">
              发布后，当前流程版本将立即生效。所有新进入的请求将按照此流程逻辑执行。
            </p>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-1.5">版本描述</label>
            <textarea 
              placeholder="请输入本次发布的修改说明..." 
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand transition-all resize-none text-sm"
            />
          </div>
        </div>
      </Modal>
    </div>
  )
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasContent />
    </ReactFlowProvider>
  )
}

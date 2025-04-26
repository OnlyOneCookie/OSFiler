/**
 * Investigation
 * 
 * Displays investigation data with graph visualization, allowing users
 * to view and manage nodes and relationships.
 */

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import apiService, { Investigation, Node, Relationship, GraphData, GraphNodeData, GraphEdgeData, Type } from '../services/api';
import ModuleRunner from '../components/modules/ModuleRunner';
import '../utils/stringUtils';
import { useNotification } from '../contexts/NotificationContext';

// Material UI Components
import { 
  Box, 
  Paper, 
  Typography, 
  List, 
  ListItem, 
  ListItemText,
  Divider, 
  Chip,
  Card,
  CardContent,
  Collapse,
  Link as MuiLink,
  Button,
  Container,
  TextField,
  MenuItem,
  Select,
  FormControl,
  FormHelperText,
  InputLabel,
  Stack,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  Slider,
} from '@mui/material';

// Material UI Icons
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import LinkIcon from '@mui/icons-material/Link';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CloseIcon from '@mui/icons-material/Close';
import ClearIcon from '@mui/icons-material/Clear';
import InfoIcon from '@mui/icons-material/Info';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddLinkIcon from '@mui/icons-material/AddLink';
import TagIcon from '@mui/icons-material/Tag';
import HubIcon from '@mui/icons-material/Hub';

// Define data types for vis-network
interface VisNode extends GraphNodeData {
  size?: number;
  title?: string | HTMLElement;
  color?: any;
}

interface VisEdge extends GraphEdgeData {
  width?: number;
  arrows?: any;
  color?: any;
}

// Form validation schemas
const NodeSchema = Yup.object().shape({
  type: Yup.string().required('Type is required'),
  name: Yup.string().required('Name is required').max(100, 'Name must be less than 100 characters'),
  data: Yup.string().max(10000, 'Data must be less than 10000 characters'),
});

const RelationshipSchema = Yup.object().shape({
  sourceNodeId: Yup.string().required('Source node is required'),
  targetNodeId: Yup.string().required('Target node is required'),
  type: Yup.string().required('Type is required'),
  strength: Yup.number().min(0, 'Minimum strength is 0').max(1, 'Maximum strength is 1').required('Strength is required'),
  data: Yup.string().max(10000, 'Data must be less than 10000 characters'),
});

const InvestigationSchema = Yup.object().shape({
  title: Yup.string().required('Title is required').max(100, 'Title must be less than 100 characters'),
  description: Yup.string().max(1000, 'Description must be less than 1000 characters'),
  tags: Yup.array().of(Yup.string())
});

// Form value interfaces
interface NodeFormValues {
  type: string;
  name: string;
  data: string;
}

interface RelationshipFormValues {
  sourceNodeId: string;
  targetNodeId: string;
  type: string;
  strength: number;
  data: string;
}

interface InvestigationFormValues {
  title: string;
  description: string;
  tags: string;
}

const InvestigationPage: React.FC = () => {
  const { notify } = useNotification();
  
  // Router hooks
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('edit') === 'true') {
      setShowEditInvestigationForm(true);
      navigate(`/investigations/${id}`, { replace: true });
    }
  }, [location, id, navigate]);

  // State management
  const [investigation, setInvestigation] = useState<Investigation | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [relationships, setRelationships] = useState<Relationship[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showNodeForm, setShowNodeForm] = useState<boolean>(false);
  const [showRelationshipForm, setShowRelationshipForm] = useState<boolean>(false);
  const [showEditNodeForm, setShowEditNodeForm] = useState<boolean>(false);
  const [showEditRelationshipForm, setShowEditRelationshipForm] = useState<boolean>(false);
  const [showEditInvestigationForm, setShowEditInvestigationForm] = useState<boolean>(false);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedRelationship, setSelectedRelationship] = useState<Relationship | null>(null);
  const [nodeTypes, setNodeTypes] = useState<Record<string, number>>({});
  const [relationshipTypes, setRelationshipTypes] = useState<Record<string, number>>({});
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [activeTab, setActiveTab] = useState<'graph' | 'nodes' | 'relationships' | 'modules'>('graph');
  const [isCheckingRelationships, setIsCheckingRelationships] = useState<boolean>(false);
  const [connectedNodeIds, setConnectedNodeIds] = useState<Set<string>>(new Set());
  const [nodeToEdit, setNodeToEdit] = useState<Node | null>(null);
  const [relationshipToEdit, setRelationshipToEdit] = useState<Relationship | null>(null);
  const [isUpdatingInvestigation, setIsUpdatingInvestigation] = useState<boolean>(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [activeRelationshipFilters, setActiveRelationshipFilters] = useState<string[]>([]);
  // Add state for global node and relationship types
  const [globalNodeTypes, setGlobalNodeTypes] = useState<Type[]>([]);
  const [globalRelationshipTypes, setGlobalRelationshipTypes] = useState<Type[]>([]);
  const [isLoadingGlobalTypes, setIsLoadingGlobalTypes] = useState<boolean>(true);

  // Refs for vis.js network
  const networkRef = useRef<Network | null>(null);
  const networkContainerRef = useRef<HTMLDivElement>(null);

  // Extract type values for form selection
  const nodeTypeValues = globalNodeTypes.map(type => type.value);
  const relationshipTypeValues = globalRelationshipTypes.map(type => type.value);

  // Initial form values
  const initialNodeValues: NodeFormValues = {
    type: nodeTypeValues[0] || 'person',
    name: '',
    data: '{}',
  };

  const initialRelationshipValues: RelationshipFormValues = {
    sourceNodeId: '',
    targetNodeId: '',
    type: relationshipTypeValues[0] || 'KNOWS',
    strength: 0.5,
    data: '{}',
  };

  const investigationFormInitialValues: InvestigationFormValues = {
    title: investigation?.title || '',
    description: investigation?.description || '',
    tags: investigation?.tags ? investigation.tags.join(', ') : ''
  };

  // Load global settings for node and relationship types
  useEffect(() => {
    const loadGlobalTypes = async () => {
      setIsLoadingGlobalTypes(true);
      try {
        // Load global node types
        const nodeTypesData = await apiService.getGlobalNodeTypes();
        if (nodeTypesData && nodeTypesData.length > 0) {
          setGlobalNodeTypes(nodeTypesData);
        }
        
        // Load global relationship types
        const relationshipTypesData = await apiService.getGlobalRelationshipTypes();
        if (relationshipTypesData && relationshipTypesData.length > 0) {
          setGlobalRelationshipTypes(relationshipTypesData);
        }
      } catch (err: any) {
        console.error('Error loading global types:', err);
      } finally {
        setIsLoadingGlobalTypes(false);
      }
    };
    
    loadGlobalTypes();
  }, []);

  // Load investigation data on component mount
  useEffect(() => {
    if (id) {
      loadInvestigationData(id);
    }
  }, [id]);

  // Initialize network when graph data is available
  useEffect(() => {
    if (graphData && networkContainerRef.current) {
      const cleanup = initializeNetwork();
      return cleanup;
    }
  }, [graphData, activeTab]);

  // Reload nodes and relationships for the current investigation
   const loadNodesAndRelationships = async () => {
    if (!investigation) return;
    
    try {
      const nodesData = await apiService.getNodesForInvestigation(investigation.id);
      setNodes(nodesData);
      
      const relationshipsData = await apiService.getRelationshipsForInvestigation(investigation.id);
      setRelationships(relationshipsData);
      
      const graphData = await apiService.getGraphData(investigation.id);
      setGraphData(graphData);
    } catch (err: any) {
      console.error('Error refreshing investigation data:', err);
    }
  };

  // Load investigation data from API
  const loadInvestigationData = async (investigationId: string) => {
    setIsLoading(true);
    
    try {
      const investigationData = await apiService.getInvestigation(investigationId);
      setInvestigation(investigationData);
      
      const nodesData = await apiService.getNodesForInvestigation(investigationId);
      setNodes(nodesData);
      
      const relationshipsData = await apiService.getRelationshipsForInvestigation(investigationId);
      setRelationships(relationshipsData);
      
      const nodeTypesData = await apiService.getNodeTypes(investigationId);
      if (investigationId && typeof nodeTypesData === 'object' && !Array.isArray(nodeTypesData)) {
        setNodeTypes(nodeTypesData as Record<string, number>);
      }
      
      const relationshipTypesData = await apiService.getRelationshipTypes(investigationId);
      if (investigationId && typeof relationshipTypesData === 'object' && !Array.isArray(relationshipTypesData)) {
        setRelationshipTypes(relationshipTypesData as Record<string, number>);
      }
      
      const graphData = await apiService.getGraphData(investigationId);
      setGraphData(graphData);
      
      setIsLoading(false);
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to load investigation data', 'error');
      console.error('Error loading investigation data:', err);
      setIsLoading(false);
    }
  };

  // Set up the vis.js network visualization
  const initializeNetwork = () => {
    if (!graphData || !networkContainerRef.current) return () => {};
    
    // Destroy existing network
    if (networkRef.current) {
      networkRef.current.destroy();
      networkRef.current = null;
    }
    
    // Process nodes to clean their labels
    const processedNodes: VisNode[] = graphData.nodes.map(node => {
      const cleanLabel = node.label.replace(/\s*\([^)]*\)\s*$/, '');
      
      // Get the full node data for the tooltip
      const fullNode = nodes.find(n => n.id === node.id);
      let tooltipContent = '';
      
      if (fullNode) {
        tooltipContent = `<div class="node-tooltip">
          <h3>${cleanLabel}</h3>
          <p><strong>Type:</strong> ${node.type}</p>`;
          
        // Add data properties if they exist
        if (fullNode.data && Object.keys(fullNode.data).length > 0) {
          Object.entries(fullNode.data).forEach(([key, value]) => {
            if (typeof value !== 'object') {
              tooltipContent += `<p><strong>${key}:</strong> ${value}</p>`;
            }
          });
        }
        
        tooltipContent += '</div>';
      }
      
      return {
        ...node,
        label: cleanLabel,
        size: 20,
        title: tooltipContent || node.label
      };
    });
    
    // Create datasets for the network
    const nodesDataset = new DataSet<VisNode>(processedNodes);
    const edgesDataset = new DataSet<VisEdge>(graphData.edges);
    
    // Network styling and physics options
    const options = {
        nodes: {
        shape: 'dot',
          size: 20,
          font: {
            size: 14,
            face: 'Arial'
          },
        scaling: {
            min: 20,
            max: 40,
            label: {
            enabled: true,
            min: 14,
            max: 30,
            maxVisible: 30,
            drawThreshold: 5
            }
        },
          color: {
            border: '#2B7CE9',
            background: '#97C2FC',
            highlight: {
              border: '#2B7CE9',
              background: '#D2E5FF'
            },
            hover: {
              border: '#2B7CE9',
              background: '#D2E5FF'
            }
        }
        },
        edges: {
        width: 2,
        smooth: {
            enabled: true,
            type: 'continuous',
            roundness: 0.5
        },
        arrows: {
            to: { enabled: true, scaleFactor: 0.5 }
        },
        font: {
            size: 12,
            face: 'Arial'
        }
        },
        physics: {
        stabilization: {
            iterations: 100
        },
        barnesHut: {
            gravitationalConstant: -80000,
            centralGravity: 0.3,
            springLength: 95,
            springConstant: 0.04,
            damping: 0.09
        }
        },
        interaction: {
        tooltipDelay: 200,
        hideEdgesOnDrag: true,
          multiselect: true,
          hover: true
        }
    };
    
    // Initialize network
    networkRef.current = new Network(
      networkContainerRef.current,
      { 
        nodes: nodesDataset, 
        edges: edgesDataset 
      },
      options
    );
    
    // Set up node selection event handlers
    networkRef.current.on('selectNode', (params) => {
      if (params.nodes.length > 0) {
        const nodeId = params.nodes[0];
        const node = nodes.find(n => n.id === nodeId);
        if (node) {
          setSelectedNode(node);
        }
      }
    });
    
    networkRef.current.on('deselectNode', () => {
      setSelectedNode(null);
    });
    
    // Set up edge selection event handlers
    networkRef.current.on('selectEdge', (params) => {
      if (params.edges.length > 0) {
        const edgeId = params.edges[0];
        const relationship = relationships.find(r => r.id === edgeId);
        if (relationship) {
          setSelectedRelationship(relationship);
        }
      }
    });
    
    networkRef.current.on('deselectEdge', () => {
      setSelectedRelationship(null);
    });
  };

  // Create a new node
  const handleCreateNode = async (values: NodeFormValues) => {
    if (!investigation) return;
    
    try {
      let nodeData = {};
      try {
        nodeData = JSON.parse(values.data);
      } catch (err) {
        return;
      }
      
      const newNode = await apiService.createNode({
        investigation_id: investigation.id,
        type: values.type,
        name: values.name,
        data: nodeData,
      });
      
      setNodes([...nodes, newNode]);
      setShowNodeForm(false);
      
      setNodeTypes({
        ...nodeTypes,
        [values.type]: (nodeTypes[values.type] || 0) + 1,
      });
      
      // Refresh graph data
      const graphData = await apiService.getGraphData(investigation.id);
      setGraphData(graphData);
      
      notify('Node created successfully', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to create node', 'error');
      console.error('Error creating node:', err);
    }
  };

  // Handle creating a new relationship
  const handleCreateRelationship = async (values: RelationshipFormValues) => {
    if (!investigation) return;
    
    try {
      let relationshipData = {};
      try {
        relationshipData = JSON.parse(values.data);
      } catch (err) {
        return;
      }
      
      const newRelationship = await apiService.createRelationship({
        investigation_id: investigation.id,
        source_node_id: values.sourceNodeId,
        target_node_id: values.targetNodeId,
        type: values.type,
        strength: values.strength,
        data: relationshipData,
      });
      
      setRelationships([...relationships, newRelationship]);
      setShowRelationshipForm(false);
      
      setRelationshipTypes({
        ...relationshipTypes,
        [values.type]: (relationshipTypes[values.type] || 0) + 1,
      });
      
      // Reload graph data
      const graphData = await apiService.getGraphData(investigation.id);
      setGraphData(graphData);
      
      notify('Relationship created successfully', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to create relationship', 'error');
      console.error('Error creating relationship:', err);
    }
  };

  // Handle deleting a node
  const handleDeleteNode = async (nodeId: string) => {
    if (!window.confirm('Are you sure you want to delete this node? This will also delete all relationships connected to it.')) {
      return;
    }
    
    try {
      await apiService.deleteNode(nodeId);
      
      // Update state
      const deletedNode = nodes.find(n => n.id === nodeId);
      if (deletedNode) {
        setNodeTypes({
          ...nodeTypes,
          [deletedNode.type]: Math.max(0, (nodeTypes[deletedNode.type] || 0) - 1),
        });
      }
      
      setNodes(nodes.filter(n => n.id !== nodeId));
      setSelectedNode(null);
      
      // Remove related relationships
      const updatedRelationships = relationships.filter(
        r => r.source_node_id !== nodeId && r.target_node_id !== nodeId
      );
      setRelationships(updatedRelationships);
      
      // Reload graph data
      if (investigation) {
        const graphData = await apiService.getGraphData(investigation.id);
        setGraphData(graphData);
      }
      
      notify('Node deleted successfully', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to delete node', 'error');
      console.error('Error deleting node:', err);
    }
  };

  // Handle deleting a relationship
  const handleDeleteRelationship = async (relationshipId: string) => {
    if (!window.confirm('Are you sure you want to delete this relationship?')) {
      return;
    }
    
    try {
      await apiService.deleteRelationship(relationshipId);
      
      // Update state
      const deletedRelationship = relationships.find(r => r.id === relationshipId);
      if (deletedRelationship) {
        setRelationshipTypes({
          ...relationshipTypes,
          [deletedRelationship.type]: Math.max(0, (relationshipTypes[deletedRelationship.type] || 0) - 1),
        });
      }
      
      setRelationships(relationships.filter(r => r.id !== relationshipId));
      setSelectedRelationship(null);
      
      // Reload graph data
      if (investigation) {
        const graphData = await apiService.getGraphData(investigation.id);
        setGraphData(graphData);
      }
      
      notify('Relationship deleted successfully', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to delete relationship', 'error');
      console.error('Error deleting relationship:', err);
    }
  };

  // Handle investigation export
  const handleExportInvestigation = async () => {
    if (!investigation) return;
    
    try {
      const exportData = await apiService.exportInvestigation(investigation.id);
      
      // Create download link
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `${investigation.title.replace(/\s+/g, '_')}_export.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
      
      notify('Investigation exported successfully', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to export investigation', 'error');
      console.error('Error exporting investigation:', err);
    }
  };

  // Enhanced component to display node data in a more structured way
  const NodeDataCard = ({ data }: { data: Record<string, any> }) => {
    // State for expanded items - moved before any conditional returns
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});
    
    if (Object.keys(data).length === 0) return null;
    
    // Toggle expansion for nested objects and arrays
    const toggleExpand = (key: string) => {
      setExpanded(prev => ({
        ...prev,
        [key]: !prev[key]
      }));
    };
    
    // Recursively render nested objects and arrays
    const renderNestedValue = (value: any, path: string = ''): JSX.Element => {
      if (value === null || value === undefined) {
        return <Typography variant="body2" component="span" color="text.secondary">null</Typography>;
      }
      
      if (typeof value === 'object') {
        if (Array.isArray(value)) {
          if (value.length === 0) {
            return <Typography variant="body2" component="span" color="text.secondary">[ ]</Typography>;
          }
          
          const isExpanded = expanded[path] || false;
          
          return (
            <Box>
              <Box 
                onClick={() => toggleExpand(path)} 
                sx={{ 
                  cursor: 'pointer', 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  color: 'primary.main',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                <Typography variant="body2" component="span">
                  Array [{value.length} items]
                </Typography>
              </Box>
              
              <Collapse in={isExpanded}>
                <List dense disablePadding sx={{ pl: 2, mt: 0.5 }}>
                  {value.map((item, index) => (
                    <ListItem key={index} disablePadding sx={{ py: 0.5 }}>
                      <ListItemText 
                        primary={
                          <Box display="flex" alignItems="flex-start">
                            <Typography variant="body2" component="span" color="text.secondary" sx={{ mr: 1, minWidth: '24px' }}>
                              {index}:
                            </Typography>
                            {renderNestedValue(item, `${path}.${index}`)}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          );
        } else {
          if (Object.keys(value).length === 0) {
            return <Typography variant="body2" component="span" color="text.secondary">{ }</Typography>;
          }
          
          const isExpanded = expanded[path] || false;
          
          return (
            <Box>
              <Box 
                onClick={() => toggleExpand(path)} 
                sx={{ 
                  cursor: 'pointer', 
                  display: 'inline-flex', 
                  alignItems: 'center',
                  color: 'primary.main',
                  '&:hover': { textDecoration: 'underline' }
                }}
              >
                <Typography variant="body2" component="span">
                  Object {`{${Object.keys(value).length} properties}`}
                </Typography>
              </Box>
              
              <Collapse in={isExpanded}>
                <List dense disablePadding sx={{ pl: 2, mt: 0.5 }}>
                  {Object.entries(value).map(([key, val]) => (
                    <ListItem key={key} disablePadding sx={{ py: 0.5 }}>
                      <ListItemText 
                        primary={
                          <Box display="flex" alignItems="flex-start">
                            <Typography variant="body2" component="span" color="text.primary" sx={{ mr: 1, fontWeight: 'medium', minWidth: '80px' }}>
                              {key}:
                            </Typography>
                            {renderNestedValue(val, `${path}.${key}`)}
                          </Box>
                        }
                      />
                    </ListItem>
                  ))}
                </List>
              </Collapse>
            </Box>
          );
        }
      }
      
      if (typeof value === 'string' && value.match(/^https?:\/\//i)) {
        return (
          <MuiLink 
            href={value} 
            target="_blank" 
            rel="noopener noreferrer"
            variant="body2"
            sx={{ wordBreak: 'break-all' }}
          >
            {value}
          </MuiLink>
        );
      }
      
      return <Typography variant="body2" component="span">{String(value)}</Typography>;
    };
    
    return (
      <Card variant="outlined" sx={{ bgcolor: 'background.paper', borderRadius: 2 }}>
        <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
          <List dense disablePadding>
            {Object.entries(data).map(([key, value], index) => (
              <React.Fragment key={key}>
                {index > 0 && <Divider component="li" />}
                <ListItem disablePadding sx={{ py: 0.5 }}>
                  <ListItemText 
                    primary={
                      <Box display="flex" alignItems="flex-start">
                        <Typography variant="body2" component="span" color="text.primary" sx={{ mr: 1, fontWeight: 'medium', minWidth: '80px' }}>
                          {key}:
                        </Typography>
                        {renderNestedValue(value, key)}
                      </Box>
                    }
                  />
                </ListItem>
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>
    );
  };

  const findConnectedNodes = async (nodeId: string) => {
    if (!nodeId) {
      setConnectedNodeIds(new Set());
      return;
    }
    
    setIsCheckingRelationships(true);
    try {
      const connectedIds = new Set<string>();
      
      for (const node of nodes) {
        if (node.id !== nodeId) {
          const isConnected = await apiService.areNodesConnected(nodeId, node.id);
          if (isConnected) {
            connectedIds.add(node.id);
          }
        }
      }
      
      setConnectedNodeIds(connectedIds);
    } catch (err) {
      console.error('Error finding connected nodes:', err);
    } finally {
      setIsCheckingRelationships(false);
    }
  };

  const handleUpdateNode = async (values: {
    type: string;
    name: string;
    data: string;
  }) => {
    if (!nodeToEdit) return;
    
    try {
      let nodeData = {};
      try {
        nodeData = JSON.parse(values.data);
      } catch (err) {
        return;
      }
      
      const updatedNode = await apiService.updateNode(
        nodeToEdit.id,
        {
          type: values.type,
          name: values.name,
          data: nodeData
        }
      );
      
      setNodes(nodes.map(node => 
        node.id === updatedNode.id ? updatedNode : node
      ));
      
      if (selectedNode && selectedNode.id === updatedNode.id) {
        setSelectedNode(updatedNode);
      }
      
      if (nodeToEdit.type !== updatedNode.type) {
        setNodeTypes({
          ...nodeTypes,
          [nodeToEdit.type]: Math.max(0, (nodeTypes[nodeToEdit.type] || 0) - 1),
          [updatedNode.type]: (nodeTypes[updatedNode.type] || 0) + 1
        });
      }
      
      setShowEditNodeForm(false);
      setNodeToEdit(null);
      
      if (investigation) {
        const graphData = await apiService.getGraphData(investigation.id);
        setGraphData(graphData);
      }
      
      notify('Node updated successfully', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to update node', 'error');
      console.error('Error updating node:', err);
    }
  };

  const openEditNodeForm = (node: Node) => {
    setNodeToEdit(node);
    setShowEditNodeForm(true);
  };

  const openEditRelationshipForm = (relationship: Relationship) => {
    setRelationshipToEdit(relationship);
    setShowEditRelationshipForm(true);
  };

  const handleUpdateRelationship = async (values: {
    type: string;
    strength: number;
    data: string;
  }) => {
    if (!relationshipToEdit) return;
    
    try {
      let relationshipData = {};
      try {
        relationshipData = JSON.parse(values.data);
      } catch (err) {
        return;
      }
      
      const updatedRelationship = await apiService.updateRelationship(
        relationshipToEdit.id,
        {
          type: values.type,
          strength: values.strength,
          data: relationshipData
        }
      );
      
      setRelationships(relationships.map(rel => 
        rel.id === updatedRelationship.id ? updatedRelationship : rel
      ));
      
      if (selectedRelationship && selectedRelationship.id === updatedRelationship.id) {
        setSelectedRelationship(updatedRelationship);
      }
      
      setShowEditRelationshipForm(false);
      setRelationshipToEdit(null);
      
      // Reload graph data
      if (investigation) {
        const graphData = await apiService.getGraphData(investigation.id);
        setGraphData(graphData);
      }
      
      notify('Relationship updated successfully', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to update relationship', 'error');
      console.error('Error updating relationship:', err);
    }
  };

  // Add function to open the edit investigation form
  const openEditInvestigationForm = () => {
    setShowEditInvestigationForm(true);
  };
  
  // Add function to handle investigation update
  const handleUpdateInvestigation = async (values: InvestigationFormValues) => {
    if (!investigation) return;
    
    setIsUpdatingInvestigation(true);
    
    try {
      // Convert comma-separated tags string to array
      const tagsArray = values.tags 
        ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag) 
        : [];
      
      const updatedInvestigation = await apiService.updateInvestigation(
        investigation.id,
        {
          title: values.title,
          description: values.description,
          tags: tagsArray
        }
      );
      
      setInvestigation(updatedInvestigation);
      setShowEditInvestigationForm(false);
      
      notify('Investigation updated successfully', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to update investigation', 'error');
      console.error('Error updating investigation:', err);
    } finally {
      setIsUpdatingInvestigation(false);
    }
  };

  // Filter nodes based on selected node types
  const filteredNodes = activeFilters.length > 0
    ? nodes.filter(node => activeFilters.includes(node.type))
    : nodes;
    
  // Filter relationships based on selected relationship types
  const filteredRelationships = activeRelationshipFilters.length > 0
    ? relationships.filter(relationship => {
        return activeRelationshipFilters.some(filter => 
          filter.toLowerCase() === relationship.type.toLowerCase()
        );
      })
    : relationships;
    
  // Toggle node type filter
  const toggleFilter = (type: string) => {
    if (activeFilters.includes(type)) {
      setActiveFilters(activeFilters.filter(t => t !== type));
    } else {
      setActiveFilters([...activeFilters, type]);
    }
  };
  
  // Toggle relationship type filter
  const toggleRelationshipFilter = (type: string) => {
    if (activeRelationshipFilters.includes(type)) {
      setActiveRelationshipFilters(activeRelationshipFilters.filter(t => t !== type));
    } else {
      setActiveRelationshipFilters([...activeRelationshipFilters, type]);
    }
  };
  
  // Reset all filters
  const resetFilters = () => {
    setActiveFilters([]);
  };
  
  // Reset all relationship filters
  const resetRelationshipFilters = () => {
    setActiveRelationshipFilters([]);
  };

  useEffect(() => {
    if (!investigation && !isLoading) {
      notify('Investigation not found or you do not have access to it', 'info');
    }
  }, [investigation, isLoading, notify]);

  // Loading state
  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ mt: 2 }}>
          Loading investigation...
        </Typography>
      </Box>
    );
  }

  // Not found state
  if (!investigation) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <Typography variant="h5" sx={{ mb: 2 }}>
          Investigation not found
        </Typography>
        <Button 
          variant="contained" 
          onClick={() => navigate('/dashboard')}
        >
          Back to Dashboard
        </Button>
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom>
              {investigation.title}
              {investigation.is_archived && (
                <Chip 
                  label="Archived" 
                  color="secondary" 
                  size="small" 
                  sx={{ ml: 2, verticalAlign: 'middle' }}
                />
              )}
            </Typography>
            {investigation.description && (
              <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
                {investigation.description}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<EditIcon />}
              onClick={openEditInvestigationForm}
              size="small"
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportInvestigation}
              size="small"
            >
              Export
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackIcon />}
              onClick={() => navigate('/')}
              size="small"
            >
              Back
            </Button>
          </Stack>
        </Box>

        <Box sx={{ mt: 1, mb: 2 }}>
          {investigation.tags.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
              <TagIcon color="action" fontSize="small" />
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {investigation.tags.map((tag, index) => (
                  <Chip key={index} label={tag} size="small" variant="outlined" />
                ))}
              </Stack>
            </Stack>
          )}
          <Stack direction="row" spacing={2} alignItems="center">
            <Chip
              icon={<HubIcon sx={{ fontSize: '0.7rem !important' }} />}
              label={`${nodes.length} nodes`}
              size="small"
              variant="outlined"
              sx={{ height: '24px' }}
            />
            <Chip
              icon={<LinkIcon sx={{ fontSize: '0.7rem !important' }} />}
              label={`${relationships.length} relationships`}
              size="small"
              variant="outlined"
              sx={{ height: '24px' }}
            />
          </Stack>
        </Box>
      </Box>

      <Tabs 
        value={activeTab} 
        onChange={(_, newValue) => setActiveTab(newValue)}
        sx={{ mb: 3 }}
        variant="scrollable"
        scrollButtons="auto"
      >
        <Tab value="graph" label="Graph View" />
        <Tab value="nodes" label={`Nodes (${nodes.length})`} />
        <Tab value="relationships" label={`Relationships (${relationships.length})`} />
        <Tab value="modules" label="Modules" />
      </Tabs>

      <Box sx={{ mt: 2 }}>
        {activeTab === 'graph' && (
          <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => setShowNodeForm(true)}
                size="small"
              >
                Add Node
              </Button>
              <Button 
                variant="contained" 
                startIcon={<AddLinkIcon />}
                onClick={() => setShowRelationshipForm(true)}
                disabled={nodes.length < 2}
                size="small"
              >
                Add Relationship
              </Button>
              {nodes.length < 2 && (
                <Typography variant="body2" sx={{ ml: 2, alignSelf: 'center', color: 'text.secondary' }}>
                  Add at least two nodes to create relationships
                </Typography>
              )}
            </Box>
            <Box 
              ref={networkContainerRef} 
              sx={{ 
                height: '600px', 
                border: '1px solid #ddd', 
                borderRadius: 1, 
                bgcolor: 'background.paper' 
              }}
            ></Box>
            
            {selectedNode && (
              <Paper elevation={1} sx={{ mt: 3, p: 2, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6">Selected Node</Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => openEditNodeForm(selectedNode)}
                      sx={{ p: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteNode(selectedNode.id)}
                      sx={{ p: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body1"><strong>Type:</strong> {selectedNode.type}</Typography>
                  <Typography variant="body1"><strong>Name:</strong> {selectedNode.name}</Typography>
                  <Typography variant="body1"><strong>ID:</strong> {selectedNode.id}</Typography>
                  {Object.keys(selectedNode.data).length > 0 && (
                    <Box sx={{ mt: 1, flexGrow: 1, overflow: 'auto' }}>
                      <NodeDataCard data={selectedNode.data} />
                    </Box>
                  )}
                </Box>
              </Paper>
            )}
            
            {selectedRelationship && (
              <Paper elevation={1} sx={{ mt: 3, p: 2, borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                  <Typography variant="h6">Selected Relationship</Typography>
                  <Stack direction="row" spacing={1}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => openEditRelationshipForm(selectedRelationship)}
                      sx={{ p: 0.5 }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRelationship(selectedRelationship.id)}
                      sx={{ p: 0.5 }}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </Box>
                <Divider sx={{ my: 1 }} />
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body1"><strong>Type:</strong> {selectedRelationship.type}</Typography>
                  <Typography variant="body1"><strong>Source:</strong> {nodes.find(n => n.id === selectedRelationship.source_node_id)?.name || selectedRelationship.source_node_id}</Typography>
                  <Typography variant="body1"><strong>Target:</strong> {nodes.find(n => n.id === selectedRelationship.target_node_id)?.name || selectedRelationship.target_node_id}</Typography>
                  <Typography variant="body1"><strong>Strength:</strong> {selectedRelationship.strength}</Typography>
                  <Typography variant="body1"><strong>ID:</strong> {selectedRelationship.id}</Typography>
                  {Object.keys(selectedRelationship.data).length > 0 && (
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="body1"><strong>Data:</strong></Typography>
                      <NodeDataCard data={selectedRelationship.data} />
                    </Box>
                  )}
                </Box>
              </Paper>
            )}
          </Box>
        )}

        {activeTab === 'nodes' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Typography variant="h6">Nodes</Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => setShowNodeForm(true)}
              >
                Add Node
              </Button>
            </Box>
            
            {Object.keys(nodeTypes).length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Node Types</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {Object.entries(nodeTypes)
                      .filter(([_, count]) => count > 0)
                      .sort((a, b) => b[1] - a[1]) // Sort by count descending
                      .map(([type, count]) => (
                        <Chip
                          key={type}
                          label={type}
                          size="small"
                          color={activeFilters.includes(type) ? 'primary' : 'default'}
                          onClick={() => toggleFilter(type)}
                          sx={{ 
                            borderRadius: '4px',
                            height: '28px',
                            backgroundColor: activeFilters.includes(type) ? '#e0e0e0' : '#f5f5f5',
                            color: 'text.primary',
                            borderColor: 'divider',
                            '&:hover': {
                              backgroundColor: activeFilters.includes(type) ? '#d5d5d5' : '#e8e8e8',
                            }
                          }}
                          deleteIcon={
                            <Box
                              sx={{
                                bgcolor: 'white',
                                color: '#111111 !important',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem !important',
                                fontWeight: 500,
                                ml: -0.5
                              }}
                            >
                              {count}
                            </Box>
                          }
                          onDelete={() => {}}
                        />
                      ))}
                  </Box>
                  {activeFilters.length > 0 && (
                    <Button 
                      variant="text" 
                      size="small"
                      onClick={resetFilters}
                      startIcon={<ClearIcon fontSize="small" />}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Box>
              </Paper>
            )}
            
            {nodes.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 1 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  No nodes have been added to this investigation yet.
                </Typography>
                <Button 
                  variant="contained" 
                  startIcon={<AddIcon />}
                  onClick={() => setShowNodeForm(true)}
                >
                  Add Your First Node
                </Button>
              </Paper>
            ) : filteredNodes.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 1 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  No nodes match the selected filters.
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<ClearIcon />}
                  onClick={resetFilters}
                >
                  Clear Filters
                </Button>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
                {filteredNodes.map((node) => (
                  <Box key={node.id} sx={{ width: { xs: '100%', md: '50%' }, p: 1 }}>
                    <Paper elevation={1} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography variant="h6" sx={{ fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', marginBottom: '0px' }}>{node.name}</Typography>
                          <Chip label={node.type} size="small" variant="outlined" sx={{ height: '24px' }} />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <IconButton
                            color="primary"
                            size="small"
                            onClick={() => openEditNodeForm(node)}
                          >
                            <EditIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            color="error"
                            size="small"
                            onClick={() => handleDeleteNode(node.id)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Divider sx={{ my: 1 }} />
                      {Object.keys(node.data).length > 0 && (
                        <Box sx={{ mt: 1, flexGrow: 1, overflow: 'auto' }}>
                          <NodeDataCard data={node.data} />
                        </Box>
                      )}
                    </Paper>
                  </Box>
                ))}
              </Box>
            )}
          </Box>
        )}

        {activeTab === 'relationships' && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
              <Typography variant="h6">Relationships</Typography>
              <Button 
                variant="contained" 
                startIcon={<AddIcon />}
                onClick={() => setShowRelationshipForm(true)}
                disabled={nodes.length < 2}
              >
                Add Relationship
              </Button>
            </Box>
            
            {relationshipTypes && Object.keys(relationshipTypes).length > 0 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1 }}>
                <Typography variant="subtitle1" sx={{ mb: 2 }}>Relationship Types</Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 1 }}>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {Object.entries(relationshipTypes)
                      .filter(([_, count]) => count > 0)
                      .sort((a, b) => b[1] - a[1])
                      .map(([type, count]) => (
                        <Chip
                          key={type}
                          label={type}
                          size="small"
                          color={activeRelationshipFilters.includes(type) ? 'primary' : 'default'}
                          onClick={() => toggleRelationshipFilter(type)}
                          sx={{ 
                            borderRadius: '4px',
                            height: '28px',
                            backgroundColor: activeRelationshipFilters.includes(type) ? '#e0e0e0' : '#f5f5f5',
                            color: 'text.primary',
                            borderColor: 'divider',
                            '&:hover': {
                              backgroundColor: activeRelationshipFilters.includes(type) ? '#d5d5d5' : '#e8e8e8',
                            }
                          }}
                          deleteIcon={
                            <Box
                              sx={{
                                bgcolor: 'white',
                                color: '#111111 !important',
                                width: '20px',
                                height: '20px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem !important',
                                fontWeight: 500,
                                ml: -0.5
                              }}
                            >
                              {count}
                            </Box>
                          }
                          onDelete={() => {}}
                        />
                      ))}
                  </Box>
                  {activeRelationshipFilters.length > 0 && (
                    <Button 
                      variant="text" 
                      size="small"
                      onClick={resetRelationshipFilters}
                      startIcon={<ClearIcon fontSize="small" />}
                      sx={{ alignSelf: 'flex-start' }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </Box>
              </Paper>
            )}
            
            {nodes.length < 2 && (
              <Paper variant="outlined" sx={{ p: 2, mb: 3, borderRadius: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Add at least two nodes to create relationships
                </Typography>
              </Paper>
            )}
            
            {relationships.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 1 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  No relationships have been added to this investigation yet.
                </Typography>
                {nodes.length >= 2 && (
                  <Button 
                    variant="contained" 
                    startIcon={<AddIcon />}
                    onClick={() => setShowRelationshipForm(true)}
                  >
                    Add Your First Relationship
                  </Button>
                )}
              </Paper>
            ) : filteredRelationships.length === 0 ? (
              <Paper variant="outlined" sx={{ p: 3, textAlign: 'center', borderRadius: 1 }}>
                <Typography variant="body1" sx={{ mb: 2 }}>
                  No relationships match the selected filters.
                </Typography>
                <Button 
                  variant="outlined" 
                  startIcon={<ClearIcon />}
                  onClick={resetRelationshipFilters}
                >
                  Clear Filters
                </Button>
              </Paper>
            ) : (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1 }}>
                {filteredRelationships.map((relationship) => {
                  const sourceNode = nodes.find((n) => n.id === relationship.source_node_id);
                  const targetNode = nodes.find((n) => n.id === relationship.target_node_id);
                  
                  return (
                    <Box key={relationship.id} sx={{ width: '100%', p: 1 }}>
                      <Paper elevation={1} sx={{ p: 2, height: '100%', display: 'flex', flexDirection: 'column' }}
                      >
                        <Box sx={{ 
                          display: 'flex', 
                          justifyContent: 'space-between', 
                          alignItems: 'center', 
                          mb: 2,
                          borderBottom: '1px solid',
                          borderColor: 'divider',
                          pb: 1.5,
                          minHeight: '40px'
                        }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" sx={{ fontSize: '1.1rem', display: 'inline-flex', alignItems: 'center', marginBottom: '0px' }}>
                              {relationship.type}
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', ml: 1.5 }}>
                              <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5, lineHeight: 1.2 }}>
                                Strength:
                              </Typography>
                              <Chip 
                                label={relationship.strength.toString()} 
                                size="small" 
                                color="primary"
                                sx={{ 
                                  height: '20px',
                                  minWidth: '30px',
                                  '& .MuiChip-label': { 
                                    px: 1, 
                                    fontWeight: 500,
                                    lineHeight: 1.2
                                  }  
                                }} 
                              />
                            </Box>
                          </Box>
                          <Box sx={{ display: 'flex', gap: 1 }}>
                            <IconButton
                              size="small"
                              color="primary"
                              onClick={() => openEditRelationshipForm(relationship)}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => handleDeleteRelationship(relationship.id)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                        
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: 2,
                          mb: 2,
                          position: 'relative'
                        }}>
                          <Paper 
                            variant="outlined" 
                            sx={{ 
                              p: 1.5, 
                              flex: 1, 
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              borderRadius: '6px',
                              borderWidth: '2px',
                              borderColor: 'grey.300',
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                              }
                            }}
                          >
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Source</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                              {sourceNode ? sourceNode.name : 'Unknown node'}
                            </Typography>
                            {sourceNode && (
                              <Chip 
                                label={sourceNode.type} 
                                size="small" 
                                variant="outlined" 
                                sx={{ height: '20px' }} 
                              />
                            )}
                          </Paper>
                          
                          <Box sx={{ 
                            position: 'relative', 
                            zIndex: 1,
                            width: '40px', 
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'background.paper',
                            borderRadius: '50%',
                            border: '2px solid',
                            borderColor: 'primary.main',
                            flexShrink: 0
                          }}>
                            <ArrowBackIcon sx={{ 
                              transform: 'rotate(180deg)',
                              color: 'primary.main'
                            }} />
                          </Box>
                          
                          <Paper 
                            variant="outlined" 
                            sx={{ 
                              p: 1.5, 
                              flex: 1, 
                              display: 'flex',
                              flexDirection: 'column',
                              alignItems: 'flex-start',
                              borderRadius: '6px',
                              borderWidth: '2px',
                              borderColor: 'grey.300',
                              transition: 'all 0.15s ease',
                              '&:hover': {
                                borderColor: 'primary.main',
                              }
                            }}
                          >
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>Target</Typography>
                            <Typography variant="body1" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                              {targetNode ? targetNode.name : 'Unknown node'}
                            </Typography>
                            {targetNode && (
                              <Chip 
                                label={targetNode.type} 
                                size="small" 
                                variant="outlined" 
                                sx={{ height: '20px' }} 
                              />
                            )}
                          </Paper>
                        </Box>
                        
                        {Object.keys(relationship.data).length > 0 && (
                          <Box sx={{ 
                            mt: 2, 
                            pt: 2, 
                            borderTop: '1px solid', 
                            borderColor: 'divider' 
                          }}>
                            <Typography variant="subtitle2" sx={{ mb: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                              <InfoIcon fontSize="small" color="action" />
                              Additional Data
                            </Typography>
                            <NodeDataCard data={relationship.data} />
                          </Box>
                        )}
                      </Paper>
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        )}
      </Box>

      {activeTab === 'modules' && (
        <Box className="modules-view">
          <ModuleRunner 
            investigationId={investigation.id}
            onAddToGraph={async (nodes) => {
              // Handle adding nodes to the graph
              try {
                const addedNodes = [];
                
                await Promise.all(nodes.map(async (nodeData) => {
                  try {
                    const newNode = await apiService.createNode({
                    investigation_id: investigation.id,
                    type: nodeData.type.toUpperCase(),
                    name: nodeData.name,
                    data: nodeData.data || {},
                  });
                    addedNodes.push(newNode);
                  } catch (err) {
                    console.error(`Failed to add node ${nodeData.name}:`, err);
                  }
                }));
                
                // After adding nodes, refresh the nodes list and graph data
                await loadNodesAndRelationships();
                notify(`Successfully added ${addedNodes.length} ${addedNodes.length === 1 ? 'profile' : 'profiles'} to the investigation`, 'success')
              } catch (err: any) {
                notify(
                  err.response?.data?.detail || 'Failed to add nodes to graph',
                  'error'
                );
                console.error('Error adding nodes to graph:', err);
              }
            }}
          />
        </Box>
      )}

      {/* Node Form Modal */}
      {showNodeForm && (
        <Dialog open={showNodeForm} onClose={() => setShowNodeForm(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Add Node
            <IconButton
              onClick={() => setShowNodeForm(false)}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Formik
              initialValues={initialNodeValues}
              validationSchema={NodeSchema}
              onSubmit={handleCreateNode}
            >
              {({ isSubmitting }) => (
                <Form>
                  <Box sx={{ mt: 2 }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel htmlFor="type">Type*</InputLabel>
                      <Field
                        as={Select}
                        id="type"
                        name="type"
                        label="Type*"
                      >
                        {isLoadingGlobalTypes ? (
                          <MenuItem value="">Loading types...</MenuItem>
                        ) : (
                          globalNodeTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.value}
                            </MenuItem>
                          ))
                        )}
                      </Field>
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                        <ErrorMessage name="type" component="div" />
                      </Box>
                    </FormControl>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Field
                        as={TextField}
                        id="name"
                        name="name"
                        label="Name*"
                        placeholder="Node name/value"
                        fullWidth
                      />
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                        <ErrorMessage name="name" component="div" />
                      </Box>
                    </FormControl>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Field
                        as={TextField}
                        id="data"
                        name="data"
                        label="Data (JSON) - Optional"
                        placeholder="{}"
                        multiline
                        rows={5}
                        fullWidth
                      />
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                        <ErrorMessage name="data" component="div" />
                      </Box>
                      <FormHelperText>
                        Enter data as JSON. Example: {`{"key1": "value1", "key2": "value2"}`}
                      </FormHelperText>
                    </FormControl>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                      <Button
                        type="button"
                        variant="outlined"
                        onClick={() => setShowNodeForm(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Adding...' : 'Add Node'}
                      </Button>
                    </Box>
                  </Box>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}

      {/* Relationship Form Modal */}
      {showRelationshipForm && (
        <Dialog open={showRelationshipForm} onClose={() => setShowRelationshipForm(false)} maxWidth="md" fullWidth>
          <DialogTitle>
            Add Relationship
            <IconButton
                onClick={() => setShowRelationshipForm(false)}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Formik
              initialValues={initialRelationshipValues}
              validationSchema={RelationshipSchema}
              onSubmit={handleCreateRelationship}
            >
              {({ isSubmitting, values, setFieldValue }) => (
                <Form>
                  <Box sx={{ mt: 2 }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel htmlFor="sourceNodeId">Source Node*</InputLabel>
                      <Field
                        as={Select}
                      id="sourceNodeId" 
                      name="sourceNodeId" 
                        label="Source Node*"
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                        const value = e.target.value;
                        setFieldValue('sourceNodeId', value);
                        
                        // Clear target when source changes
                        setFieldValue('targetNodeId', '');
                        
                        // Find all nodes that are already connected to this node
                        if (value) {
                          findConnectedNodes(value);
                        } else {
                          setConnectedNodeIds(new Set());
                        }
                      }}
                    >
                        <MenuItem value="">Select a source node</MenuItem>
                      {nodes.map((node) => (
                          <MenuItem key={node.id} value={node.id}>
                          {node.name} ({node.type})
                          </MenuItem>
                      ))}
                    </Field>
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                        <ErrorMessage name="sourceNodeId" component="div" />
                      </Box>
                    </FormControl>
                  
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel htmlFor="targetNodeId">Target Node*</InputLabel>
                      <Field
                        as={Select}
                      id="targetNodeId" 
                      name="targetNodeId" 
                        label="Target Node*"
                      disabled={!values.sourceNodeId || isCheckingRelationships || nodes.filter(node => 
                        node.id !== values.sourceNodeId && !connectedNodeIds.has(node.id)
                      ).length === 0}
                    >
                        <MenuItem value="">
                        {!values.sourceNodeId 
                          ? "Select a source node first" 
                          : isCheckingRelationships 
                            ? "Checking available nodes..." 
                            : nodes.filter(node => 
                              node.id !== values.sourceNodeId && !connectedNodeIds.has(node.id)
                            ).length === 0
                              ? "No available nodes to connect"
                              : "Select a target node"
                      }
                        </MenuItem>
                    {values.sourceNodeId && !isCheckingRelationships && nodes
                      .filter(node => 
                        // Filter out the source node
                        node.id !== values.sourceNodeId && 
                        // Filter out already connected nodes
                        !connectedNodeIds.has(node.id)
                      )
                      .map((node) => (
                            <MenuItem key={node.id} value={node.id}>
                          {node.name} ({node.type})
                            </MenuItem>
                      ))}
                  </Field>
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                        <ErrorMessage name="targetNodeId" component="div" />
                      </Box>
                  {values.sourceNodeId && isCheckingRelationships && (
                        <Box sx={{ color: 'text.secondary', fontSize: '0.875rem', mt: 1 }}>
                          Checking available nodes...
                        </Box>
                  )}
                  {values.sourceNodeId && !isCheckingRelationships && nodes.filter(
                    node => node.id !== values.sourceNodeId && !connectedNodeIds.has(node.id)
                  ).length === 0 && (
                        <Box sx={{ color: 'error.main', fontSize: '0.875rem', mt: 1 }}>
                      No available nodes to connect. All other nodes are already connected to this one.
                        </Box>
                  )}
                    </FormControl>
                  
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel htmlFor="type">Relationship Type*</InputLabel>
                      <Field
                        as={Select}
                        id="type"
                        name="type"
                        label="Relationship Type*"
                      >
                      {isLoadingGlobalTypes ? (
                          <MenuItem value="">Loading types...</MenuItem>
                      ) : (
                        globalRelationshipTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                            {type.value}
                            </MenuItem>
                        ))
                      )}
                    </Field>
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                        <ErrorMessage name="type" component="div" />
                      </Box>
                    </FormControl>
                  
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Strength* ({values.strength})
                      </Typography>
                      <Box sx={{ px: 1 }}>
                    <Field
                          as={Slider}
                      name="strength"
                          min={0}
                          max={1}
                          step={0.1}
                          valueLabelDisplay="auto"
                          marks
                          onChange={(e: any, value: number) => {
                        setFieldValue('strength', value);
                      }}
                    />
                      </Box>
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                        <ErrorMessage name="strength" component="div" />
                      </Box>
                      <FormHelperText>0 = Weak, 1 = Strong</FormHelperText>
                    </Box>
                  
                    <FormControl fullWidth sx={{ mb: 2 }}>
                    <Field
                        as={TextField}
                      id="data"
                      name="data"
                        label="Data (JSON) - Optional"
                      placeholder="{}"
                        multiline
                      rows={5}
                    />
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                        <ErrorMessage name="data" component="div" />
                      </Box>
                      <FormHelperText>
                      Enter data as JSON. Example: {`{"key1": "value1", "key2": "value2"}`}
                      </FormHelperText>
                    </FormControl>
                  
                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 3 }}>
                      <Button
                      type="button"
                        variant="outlined"
                      onClick={() => setShowRelationshipForm(false)}
                    >
                      Cancel
                      </Button>
                      <Button
                      type="submit"
                        variant="contained"
                      disabled={isSubmitting || values.sourceNodeId === values.targetNodeId || !values.sourceNodeId || !values.targetNodeId}
                    >
                      {isSubmitting ? 'Adding...' : 'Add Relationship'}
                      </Button>
                    </Box>
                  </Box>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Node Form Modal */}
      {showEditNodeForm && nodeToEdit && (
        <Dialog 
          open={showEditNodeForm} 
          onClose={() => {
            setShowEditNodeForm(false);
            setNodeToEdit(null);
          }} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            Edit Node
            <IconButton
              onClick={() => {
                setShowEditNodeForm(false);
                setNodeToEdit(null);
              }}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Formik
              initialValues={{
                type: nodeToEdit.type,
                name: nodeToEdit.name,
                data: JSON.stringify(nodeToEdit.data, null, 2)
              }}
              validationSchema={NodeSchema}
              onSubmit={handleUpdateNode}
            >
              {({ isSubmitting }) => (
                <Form>
                  <Box sx={{ mt: 2 }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel htmlFor="type">Type*</InputLabel>
                      <Field
                        as={Select}
                        id="type"
                        name="type"
                        label="Type*"
                      >
                        {isLoadingGlobalTypes ? (
                          <MenuItem value="">Loading types...</MenuItem>
                        ) : (
                          globalNodeTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.value}
                            </MenuItem>
                          ))
                        )}
                      </Field>
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                        <ErrorMessage name="type" component="div" />
                      </Box>
                    </FormControl>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Field
                        as={TextField}
                        id="name"
                        name="name"
                        label="Name*"
                        placeholder="Node name/value"
                        error={false}
                        helperText={<ErrorMessage name="name" />}
                      />
                    </FormControl>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Field
                        as={TextField}
                        id="data"
                        name="data"
                        label="Data (JSON)"
                        placeholder="{}"
                        multiline
                        rows={5}
                        error={false}
                        helperText={<ErrorMessage name="data" />}
                      />
                      <FormHelperText>
                        Enter data as JSON. Example: {`{"key1": "value1", "key2": "value2"}`}
                      </FormHelperText>
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1 }}>
                    <Button
                      onClick={() => {
                        setShowEditNodeForm(false);
                        setNodeToEdit(null);
                      }}
                      variant="outlined"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isSubmitting}
                      startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Relationship Form Modal */}
      {showEditRelationshipForm && relationshipToEdit && (
        <Dialog 
          open={showEditRelationshipForm} 
          onClose={() => {
            setShowEditRelationshipForm(false);
            setRelationshipToEdit(null);
          }} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            Edit Relationship
            <IconButton
              onClick={() => {
                setShowEditRelationshipForm(false);
                setRelationshipToEdit(null);
              }}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Formik
              initialValues={{
                type: relationshipToEdit.type,
                strength: relationshipToEdit.strength,
                data: JSON.stringify(relationshipToEdit.data, null, 2)
              }}
              validationSchema={Yup.object().shape({
                type: Yup.string().required('Type is required'),
                strength: Yup.number()
                  .min(0, 'Strength must be between 0 and 1')
                  .max(1, 'Strength must be between 0 and 1')
                  .required('Strength is required'),
                data: Yup.string().test('is-json', 'Must be valid JSON', (value) => {
                  if (!value) return true;
                  try {
                    JSON.parse(value);
                    return true;
                  } catch (err) {
                    return false;
                  }
                })
              })}
              onSubmit={handleUpdateRelationship}
            >
              {({ isSubmitting, values, setFieldValue }) => (
                <Form>
                  <Box sx={{ mt: 2 }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <InputLabel htmlFor="type">Relationship Type*</InputLabel>
                      <Field
                        as={Select}
                        id="type"
                        name="type"
                        label="Relationship Type*"
                      >
                        {isLoadingGlobalTypes ? (
                          <MenuItem value="">Loading types...</MenuItem>
                        ) : (
                          globalRelationshipTypes.map((type) => (
                            <MenuItem key={type.value} value={type.value}>
                              {type.value}
                            </MenuItem>
                          ))
                        )}
                      </Field>
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                        <ErrorMessage name="type" component="div" />
                      </Box>
                    </FormControl>
                    
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Source Node</Typography>
                    <TextField
                      fullWidth
                      value={nodes.find(n => n.id === relationshipToEdit.source_node_id)?.name || relationshipToEdit.source_node_id}
                      disabled
                      sx={{ mb: 2 }}
                      helperText="Source node cannot be changed"
                    />
                    
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>Target Node</Typography>
                    <TextField
                      fullWidth
                      value={nodes.find(n => n.id === relationshipToEdit.target_node_id)?.name || relationshipToEdit.target_node_id}
                      disabled
                      sx={{ mb: 2 }}
                      helperText="Target node cannot be changed"
                    />
                    
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Strength* ({values.strength})
                    </Typography>
                    <Box sx={{ px: 1, mb: 2 }}>
                      <Field
                        as={Slider}
                        name="strength"
                        min={0}
                        max={1}
                        step={0.1}
                        valueLabelDisplay="auto"
                        marks
                        onChange={(e: any, value: number) => {
                          setFieldValue('strength', value);
                        }}
                      />
                      <Box sx={{ color: 'error.main', fontSize: '0.75rem', mt: 0.5 }}>
                        <ErrorMessage name="strength" component="div" />
                      </Box>
                      <FormHelperText>0 = Weak, 1 = Strong</FormHelperText>
                    </Box>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Field
                        as={TextField}
                        id="data"
                        name="data"
                        label="Data (JSON)"
                        placeholder="{}"
                        multiline
                        rows={5}
                        error={false}
                        helperText={<ErrorMessage name="data" />}
                      />
                      <FormHelperText>
                        Enter data as JSON. Example: {`{"key1": "value1", "key2": "value2"}`}
                      </FormHelperText>
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1 }}>
                    <Button
                      onClick={() => {
                        setShowEditRelationshipForm(false);
                        setRelationshipToEdit(null);
                      }}
                      variant="outlined"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="submit-button"
                      disabled={isSubmitting}
                      startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                    >
                      {isSubmitting ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Investigation Form Modal */}
      {showEditInvestigationForm && (
        <Dialog 
          open={showEditInvestigationForm} 
          onClose={() => setShowEditInvestigationForm(false)} 
          maxWidth="md" 
          fullWidth
        >
          <DialogTitle>
            Edit Investigation
            <IconButton
              onClick={() => setShowEditInvestigationForm(false)}
              sx={{ position: 'absolute', top: 8, right: 8 }}
            >
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <DialogContent>
            <Formik
              initialValues={investigationFormInitialValues}
              validationSchema={InvestigationSchema}
              onSubmit={(values) => {
                handleUpdateInvestigation(values);
              }}
            >
              {({ isSubmitting }) => (
                <Form>
                  <Box sx={{ mt: 2 }}>
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Field
                        as={TextField}
                        id="title"
                        name="title"
                        label="Title*"
                        placeholder="Investigation title"
                        error={false}
                        helperText={<ErrorMessage name="title" />}
                      />
                    </FormControl>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Field
                        as={TextField}
                        id="description"
                        name="description"
                        label="Description"
                        placeholder="Investigation description"
                        multiline
                        rows={3}
                        error={false}
                        helperText={<ErrorMessage name="description" />}
                      />
                    </FormControl>
                    
                    <FormControl fullWidth sx={{ mb: 2 }}>
                      <Field
                        as={TextField}
                        id="tags"
                        name="tags"
                        label="Tags"
                        placeholder="Enter tags separated by commas (e.g. osint, person, case123)"
                        error={false}
                        helperText={
                          <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                            <ErrorMessage name="tags" />
                            <Typography variant="caption" color="text.secondary">
                              Separate multiple tags with commas
                            </Typography>
                          </Box>
                        }
                      />
                    </FormControl>
                  </Box>
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3, gap: 1 }}>
                    <Button
                      onClick={() => setShowEditInvestigationForm(false)}
                      variant="outlined"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={isSubmitting || isUpdatingInvestigation}
                      startIcon={isUpdatingInvestigation ? <CircularProgress size={20} /> : null}
                    >
                      {isUpdatingInvestigation ? 'Saving...' : 'Save Changes'}
                    </Button>
                  </Box>
                </Form>
              )}
            </Formik>
          </DialogContent>
        </Dialog>
      )}
    </Container>
  );
};

export default InvestigationPage;

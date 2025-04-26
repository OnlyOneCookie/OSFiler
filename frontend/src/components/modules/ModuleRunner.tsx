/**
 * ModuleRunner component.
 * 
 * This component provides a streamlined interface for running modules within
 * an investigation. It dynamically generates forms based on module parameters
 * and displays the results in an appropriate format.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import * as Yup from 'yup';

// Material UI imports
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  Link,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
  Alert,
  AlertTitle,
  Tooltip,
  Checkbox,
  FormControlLabel,
  Avatar,
  CardMedia
} from '@mui/material';

// Material UI icons
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import LaunchIcon from '@mui/icons-material/Launch';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import InfoIcon from '@mui/icons-material/Info';

// Generic entity type icons
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import HttpIcon from '@mui/icons-material/Http';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DescriptionIcon from '@mui/icons-material/Description';
import PhoneIcon from '@mui/icons-material/Phone';
import PersonIcon from '@mui/icons-material/Person';
import GroupIcon from '@mui/icons-material/Group';
import StorageIcon from '@mui/icons-material/Storage';
import CodeIcon from '@mui/icons-material/Code';
import ImageIcon from '@mui/icons-material/Image';
import LanguageIcon from '@mui/icons-material/Language';
import CircleIcon from '@mui/icons-material/Circle';

// Dynamic icon import
import * as allMuiIcons from '@mui/icons-material';

import apiService, { Module, ModuleExecuteResult } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';

interface ModuleRunnerProps {
  investigationId: string;
  onAddToGraph: (nodes: any[]) => void;
}

// Component to show if a node exists in the graph
interface NodeExistenceProps {
  card: any;
  investigationId: string;
  onNodeExists?: (exists: boolean) => void;
  children: (checking: boolean, exists: boolean, recheckNode: () => void) => React.ReactNode;
}

const NodeExistence: React.FC<NodeExistenceProps> = ({ card, investigationId, onNodeExists, children }) => {
  const [isInGraph, setIsInGraph] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const [checkCounter, setCheckCounter] = useState(0);
  
  // Function to force a recheck, can be called after adding to graph
  const recheckNode = useCallback(() => {
    setCheckCounter(prev => prev + 1);
    setIsChecking(true);
  }, []);
  
  useEffect(() => {
    const checkIfExists = async () => {
      try {
        setIsChecking(true);
        const nodes = await apiService.getNodesForInvestigation(investigationId);
        
        // Check if this node already exists in the investigation
        const exists = nodes.some(node => {
          // Check by type and name/title
          if (card.type && node.type === card.type.toUpperCase() && 
             (node.name === card.title || node.name === card.name)) {
            return true;
          }
          
          // Check by URL if available
          if (card.url && node.data && node.data.url === card.url) {
            return true;
          }
          
          // Check by platform and username for social accounts
          if (card.platform && node.data && 
              node.data.platform === card.platform && 
              node.data.username === card.username) {
            return true;
          }
          
          return false;
        });
        
        setIsInGraph(exists);
        if (onNodeExists) {
          onNodeExists(exists);
        }
      } catch (err) {
        console.error("Error checking node existence:", err);
      } finally {
        setIsChecking(false);
      }
    };
    
    checkIfExists();
  }, [card, investigationId, onNodeExists, checkCounter]);
  
  return <>{children(isChecking, isInGraph, recheckNode)}</>;
};

const ModuleRunner: React.FC<ModuleRunnerProps> = ({ investigationId, onAddToGraph }) => {
  // State
  const [modules, setModules] = useState<Module[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [isLoadingModules, setIsLoadingModules] = useState<boolean>(true);
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [result, setResult] = useState<ModuleExecuteResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showParameters, setShowParameters] = useState<boolean>(true);
  const { notify } = useNotification();

  // Load available modules on component mount
  useEffect(() => {
    loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load modules from API
  const loadModules = async () => {
    setIsLoadingModules(true);
    setError(null);
    
    try {
      const modulesList = await apiService.getModules();
      setModules(modulesList);
      
      // Don't automatically select a module
      // Let the user make an explicit choice
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || 'Failed to load modules';
      setError(errorMsg);
      notify(errorMsg, 'error');
      console.error('Error loading modules:', err);
    } finally {
      setIsLoadingModules(false);
    }
  };

  // Select a module to run
  const selectModule = async (moduleName: string) => {
    setError(null);
    
    // If empty module name, just clear the selection
    if (!moduleName) {
      setSelectedModule(null);
      setResult(null);
      setShowParameters(true);
      return;
    }
    
    try {
      const moduleInfo = await apiService.getModule(moduleName);
      setSelectedModule(moduleInfo);
      setResult(null); // Clear previous results
      setShowParameters(true); // Show parameters when selecting a new module
      notify(`Module ${moduleInfo.display_name || moduleName} loaded successfully`, 'info');
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || `Failed to load module ${moduleName}`;
      setError(errorMsg);
      notify(errorMsg, 'error');
      console.error(`Error loading module ${moduleName}: ${err.message}`);
    }
  };

  // Execute the selected module
  const executeModule = async (params: Record<string, any>) => {
    if (!selectedModule) return;
    
    setIsExecuting(true);
    setError(null);
    setResult(null);
    
    try {
      // Add investigation ID to parameters
      const moduleParams = {
        ...params,
        investigation_id: investigationId
      };
      
      // Execute the module
      const result = await apiService.executeModule(selectedModule.name, moduleParams);
      setResult(result);
      setShowParameters(false); // Hide parameters to show results
      
      if (result.status === 'success') {
        notify(`Module ${selectedModule.display_name || selectedModule.name} executed successfully`, 'success');
      } else if (result.error) {
        notify(result.error, 'warning');
      }
    } catch (err: any) {
      const errorMsg = err.response?.data?.detail || `Failed to execute module ${selectedModule.name}`;
      setError(errorMsg);
      notify(errorMsg, 'error');
      console.error(`Error executing module ${selectedModule.name}: ${err.message}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Generate a validation schema based on module parameters
  const generateValidationSchema = (module: Module) => {
    const schemaFields: Record<string, any> = {};
    
    // Add validation for required parameters
    (module.required_params || []).forEach(param => {
      switch (param.type) {
        case 'string':
          schemaFields[param.name] = Yup.string().required(`${param.name} is required`);
          break;
        case 'integer':
        case 'number':
          schemaFields[param.name] = Yup.number().required(`${param.name} is required`);
          break;
        case 'boolean':
          schemaFields[param.name] = Yup.boolean();
          break;
        case 'array':
          schemaFields[param.name] = Yup.array().required(`${param.name} is required`);
          break;
        case 'object':
          schemaFields[param.name] = Yup.object().required(`${param.name} is required`);
          break;
        default:
          schemaFields[param.name] = Yup.mixed().required(`${param.name} is required`);
      }
    });
    
    // Add validation for optional parameters (not required)
    (module.optional_params || []).forEach(param => {
      switch (param.type) {
        case 'string':
          schemaFields[param.name] = Yup.string();
          break;
        case 'integer':
        case 'number':
          schemaFields[param.name] = Yup.number();
          break;
        case 'boolean':
          schemaFields[param.name] = Yup.boolean();
          break;
        case 'array':
          schemaFields[param.name] = Yup.array();
          break;
        case 'object':
          schemaFields[param.name] = Yup.object();
          break;
        default:
          schemaFields[param.name] = Yup.mixed();
      }
    });
    
    return Yup.object().shape(schemaFields);
  };

  // Generate initial values for the form
  const generateInitialValues = (module: Module) => {
    const initialValues: Record<string, any> = {};
    
    // Set default values for required parameters
    (module.required_params || []).forEach(param => {
      switch (param.type) {
        case 'string':
          initialValues[param.name] = '';
          break;
        case 'integer':
        case 'number':
          initialValues[param.name] = param.default !== undefined ? param.default : 0;
          break;
        case 'boolean':
          initialValues[param.name] = param.default !== undefined ? param.default : false;
          break;
        case 'array':
          initialValues[param.name] = param.default !== undefined ? param.default : [];
          break;
        case 'object':
          initialValues[param.name] = param.default !== undefined ? param.default : {};
          break;
        default:
          initialValues[param.name] = param.default !== undefined ? param.default : '';
      }
    });
    
    // Set default values for optional parameters
    (module.optional_params || []).forEach(param => {
      // Check if the module has a config_schema with defaults for this parameter
      const configDefault = module.config_schema && 
                          module.config_schema[param.name] && 
                          module.config_schema[param.name].default;
      
      switch (param.type) {
        case 'string':
          initialValues[param.name] = param.default !== undefined ? param.default : 
                                     (configDefault !== undefined ? configDefault : '');
          break;
        case 'integer':
        case 'number':
          initialValues[param.name] = param.default !== undefined ? param.default : 
                                     (configDefault !== undefined ? configDefault : 0);
          break;
        case 'boolean':
          initialValues[param.name] = param.default !== undefined ? param.default : 
                                     (configDefault !== undefined ? configDefault : false);
          break;
        case 'array':
          initialValues[param.name] = param.default !== undefined ? param.default : 
                                     (configDefault !== undefined ? configDefault : []);
          break;
        case 'object':
          initialValues[param.name] = param.default !== undefined ? param.default : 
                                     (configDefault !== undefined ? configDefault : {});
          break;
        default:
          initialValues[param.name] = param.default !== undefined ? param.default : 
                                     (configDefault !== undefined ? configDefault : '');
      }
    });
    
    // Log the initial values for debugging
    console.log('Generated initial values for module:', initialValues);
    
    return initialValues;
  };

  // Parse form values based on parameter types
  const parseFormValues = (values: Record<string, any>, module: Module) => {
    const parsedValues: Record<string, any> = { ...values };
    
    // Parse all parameters based on their type
    [...(module.required_params || []), ...(module.optional_params || [])].forEach(param => {
      const value = values[param.name];
      
      // Skip if no value
      if (value === undefined || value === '') return;
      
      switch (param.type) {
        case 'array':
          // Parse comma-separated string to array
          if (typeof value === 'string') {
            parsedValues[param.name] = value.split(',')
              .map(item => item.trim())
              .filter(item => item !== '');
          }
          break;
          
        case 'object':
          // Parse JSON string to object
          if (typeof value === 'string') {
            try {
              parsedValues[param.name] = JSON.parse(value);
            } catch (err) {
              console.error(`Error parsing JSON for ${param.name}:`, err);
              // Leave as is if parsing fails
            }
          }
          break;
          
        case 'integer':
          // Convert to integer
          if (typeof value === 'string' || typeof value === 'number') {
            parsedValues[param.name] = parseInt(value.toString(), 10);
          }
          break;
          
        case 'number':
          // Convert to number
          if (typeof value === 'string' || typeof value === 'number') {
            parsedValues[param.name] = parseFloat(value.toString());
          }
          break;
          
        case 'boolean':
          // Ensure boolean
          parsedValues[param.name] = Boolean(value);
          break;
          
        default:
          // Leave as is
          break;
      }
    });
    
    return parsedValues;
  };

  // Add nodes to graph
  const handleAddToGraph = () => {
    if (!result || !result.data) {
      setError('No data to add to the graph');
      notify('No data to add to the graph', 'error');
      return;
    }
    
    let nodes = [];
    
    // Handle items from module results
    if (result.data.items && result.data.items.length > 0) {
      nodes = result.data.items.map((item: any) => ({
        type: (item.type || selectedModule?.name || 'module_result').toUpperCase(),
        name: item.name || item.title || `Result from ${selectedModule?.name || 'module'}`,
        data: item
      }));
    }
    // Handle node results directly
    else if (result.data.nodes && result.data.nodes.length > 0) {
      nodes = result.data.nodes.map((node: any) => ({
        ...node,
        type: (node.type || 'CUSTOM').toUpperCase()
      }));
    }
    // Handle display cards if available - various formats
    // TODO: Make a component and also for the backend (simple developing)
    else if (result.data.display) {
      // Handle card collection
      if (result.data.display.type === 'card_collection' && 
          result.data.display.cards && 
          result.data.display.cards.length > 0) {
        nodes = result.data.display.cards.map((card: any) => createNodeFromCard(card, selectedModule?.name));
      }
      // Handle single card
      else if (result.data.display.type === 'single_card' && result.data.display.card) {
        nodes = [createNodeFromCard(result.data.display.card, selectedModule?.name)];
      }
      // Handle simple text (create a generic node)
      else if (result.data.display.type === 'simple_text' && result.data.display.text) {
        nodes = [{
          type: (selectedModule?.name || 'TEXT_RESULT').toUpperCase(),
          name: result.data.display.title || 'Text Result',
          data: {
            text: result.data.display.text,
            source: selectedModule?.name || 'module_result',
            timestamp: new Date().toISOString()
          }
        }];
      }
    }
    // Handle other result types 
    else {
      // Create a generic node from the result data
      nodes = [{
        type: (selectedModule?.name || 'module_result').toUpperCase(),
        name: result.data.name || result.data.title || `Result from ${selectedModule?.name || 'module'}`,
        data: result.data
      }];
    }
    
    // If no nodes were created, show an error
    if (nodes.length === 0) {
      setError('No data to add to the graph');
      notify('No data to add to the graph', 'error');
      return;
    }
    
    onAddToGraph(nodes);
    notify(`Added ${nodes.length} node${nodes.length !== 1 ? 's' : ''} to the graph`, 'success');
  };

  // Render parameter input field
  const renderParameterInput = (param: any, errors: any, touched: any) => {
    const fieldId = `param-${param.name}`;
    const hasError = errors[param.name] && touched[param.name];
    
    switch (param.type) {
      case 'boolean':
        return (
          <FormControlLabel
            control={
            <Field
                as={Checkbox}
              id={fieldId}
              name={param.name}
                color="primary"
              />
            }
            label={param.description || ''}
          />
        );
        
      case 'array':
        return (
            <Field
            as={TextField}
              id={fieldId}
              name={param.name}
            fullWidth
            variant="outlined"
            size="small"
            error={hasError}
              placeholder="Comma-separated values"
            helperText={
              hasError ? (
                <ErrorMessage name={param.name} />
              ) : (
                "Enter values separated by commas"
              )
            }
          />
        );
        
      case 'object':
        return (
            <Field
            as={TextField}
              id={fieldId}
              name={param.name}
            fullWidth
            multiline
            minRows={3}
            variant="outlined"
            size="small"
            error={hasError}
              placeholder="{}"
            helperText={
              hasError ? (
                <ErrorMessage name={param.name} />
              ) : (
                "Enter valid JSON object"
              )
            }
          />
        );
        
      case 'integer':
      case 'number':
        return (
          <Field
            as={TextField}
            type="number"
            id={fieldId}
            name={param.name}
            fullWidth
            variant="outlined"
            size="small"
            error={hasError}
            helperText={hasError && <ErrorMessage name={param.name} />}
          />
        );
        
      case 'string':
      default:
        return (
          <Field
            as={TextField}
            id={fieldId}
            name={param.name}
            fullWidth
            variant="outlined"
            size="small"
            error={hasError}
            helperText={hasError && <ErrorMessage name={param.name} />}
          />
        );
    }
  };

  // Helper function to get color for entity type
  const getTypeColor = (type: string) => {
    if (!type) return 'primary.main';
    
    // Generate a consistent color based on type name
    const stringToColor = (str: string) => {
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
      }
      
      const hue = Math.abs(hash) % 360;
      return `hsl(${hue}, 70%, 50%)`;
    };
    
    return stringToColor(type.toLowerCase());
  };

  // Dynamic icon loading function that attempts to load Material-UI icons by name
  const getDynamicIcon = (name: string, props = {}) => {
    // Clean up the name for icon lookup
    // Convert to PascalCase and append "Icon" (Material-UI icon naming convention)
    const cleanName = name
      .replace(/[^a-zA-Z0-9]/g, '') // Remove special characters
      .replace(/(?:^|[-_])(\w)/g, (_, c) => c ? c.toUpperCase() : '') + 'Icon'; // Convert to PascalCase & add Icon suffix
    
    try {
      // Try to get the icon component from MUI icons library
      const IconComponent = (allMuiIcons as any)[cleanName];
      return IconComponent ? <IconComponent {...props} /> : null;
    } catch (error) {
      console.warn(`Failed to load icon for "${name}": ${error}`);
      return null;
    }
  };

  // Generic entity avatar based on entity type
  const EntityAvatar = ({ entity, size = 40 }: { entity: any, size?: number }) => {
    if (!entity) return null;
    
    // Helper to determine icon based on entity type
    const getEntityIcon = () => {
      const entityType = entity.type || '';
      
      // Try to dynamically load an icon first
      const dynamicIcon = getDynamicIcon(entityType);
      if (dynamicIcon) return dynamicIcon;
      
      // Normalize the type for comparison
      const type = entityType.toLowerCase();
      
      // Handle based on generic entity types
      if (type.includes('profile') || type.includes('user') || type.includes('account')) {
        return <PersonIcon />;
      }
      if (type.includes('organization') || type.includes('group') || type.includes('company')) {
        return <GroupIcon />;
      }
      if (type.includes('location') || type.includes('place') || type.includes('address')) {
        return <LocationOnIcon />;
      }
      if (type.includes('document') || type.includes('file')) {
        return <DescriptionIcon />;
      }
      if (type.includes('phone')) {
        return <PhoneIcon />;
      }
      if (type.includes('image') || type.includes('photo')) {
        return <ImageIcon />;
      }
      if (type.includes('database') || type.includes('storage')) {
        return <StorageIcon />;
      }
      if (type.includes('code')) {
        return <CodeIcon />;
      }
      if (type.includes('website') || type.includes('domain') || type.includes('url')) {
        return <LanguageIcon />;
      }
      if (type.includes('email') || type.includes('mail')) {
        return <AlternateEmailIcon />;
      }
      if (type.includes('ip') || type.includes('network')) {
        return <HttpIcon />;
      }
      
      // Default: use a generic icon or the first letter of the type
      return type ? type.charAt(0).toUpperCase() : <CircleIcon />;
    };
    
    // Get color based on entity type
    const getAvatarColor = () => {
      const type = entity.type || '';
      return getTypeColor(type);
    };
    
    return (
      <Avatar 
        sx={{ 
          bgcolor: getAvatarColor(),
          width: size,
          height: size,
          fontSize: size * 0.5,
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}
      >
        {getEntityIcon()}
      </Avatar>
    );
  };

  // Helper function to process card data and create standardized format
  const processCardData = (card: any) => {
    const cardType = card.type || 'CUSTOM';
    const cardTitle = card.title || card.name || 'Result Item';
    const cardSubtitle = card.subtitle || '';
    const cardUrl = card.url || '';
    
    return {
      type: cardType,
      title: cardTitle,
      subtitle: cardSubtitle,
      url: cardUrl,
      originalData: card
    };
  };

  // Create standardized node from card data
  const createNodeFromCard = (card: any, moduleName?: string) => {
    const processedCard = processCardData(card);
    
    // Create a clean data object without UI-specific properties
    const nodeData = { ...card };
    
    // Remove UI-only properties that shouldn't be stored in the database
    delete nodeData.actions;
    
    return {
      type: processedCard.type.toUpperCase(),
      name: processedCard.title,
      data: {
        ...nodeData,
        source: moduleName || 'module_result'
      }
    };
  };

  // Render a single card for module result
  const renderSingleCard = (cardData: any) => {
    const processedCard = processCardData(cardData);
    
    return (
      <NodeExistence card={cardData} investigationId={investigationId}>
        {(isChecking, isInGraph, recheckNode) => (
          <Card 
            variant="outlined" 
            sx={{ 
              maxWidth: '100%',
              boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
              borderRadius: '12px',
              overflow: 'hidden',
              mb: 2,
              border: '1px solid',
              borderColor: isInGraph ? 'success.main' : 'divider'
            }}
          >
            <CardHeader
              avatar={<EntityAvatar entity={{ type: processedCard.type }} size={48} />}
              title={
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="h6" fontWeight={600} sx={{ mr: 1 }}>
                    {processedCard.title}
                  </Typography>
                  {processedCard.url && (
                    <IconButton
                      size="small"
                      component={Link}
                      href={processedCard.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{ 
                        p: 0.5,
                        color: 'primary.main',
                        '&:hover': { color: 'primary.dark' }
                      }}
                    >
                      <LaunchIcon fontSize="small" />
                    </IconButton>
                  )}
                </Box>
              }
              subheader={processedCard.subtitle}
              subheaderTypographyProps={{
                variant: 'body2',
                color: 'text.secondary'
              }}
              action={
                isChecking ? (
                  <CircularProgress size={24} thickness={4} />
                ) : isInGraph ? (
                  <Tooltip title="Already in investigation">
                    <CheckCircleIcon color="success" />
                  </Tooltip>
                ) : null
              }
            />
            {processedCard.originalData.image_url && (
              <CardMedia
                component="img"
                height="140"
                image={processedCard.originalData.image_url}
                alt={processedCard.title}
                sx={{
                  objectFit: 'cover',
                  objectPosition: 'center'
                }}
              />
            )}
            <CardActions sx={{ 
              borderTop: '1px solid',
              borderColor: 'divider',
              p: 1.5,
              justifyContent: 'center',
              mt: 'auto'
            }}>
              {!isInGraph ? (
                <Button 
                  size="small" 
                  color="primary" 
                  startIcon={<AddIcon />}
                  onClick={() => {
                    const node = createNodeFromCard(processedCard.originalData, selectedModule?.name);
                    onAddToGraph([node]);
                    notify(`Added ${processedCard.title} to investigation`, 'success');
                    // After adding to graph, recheck the node status
                    setTimeout(recheckNode, 500);
                  }}
                  fullWidth
                  variant="contained"
                >
                  Add to Graph
                </Button>
              ) : (
                <Button
                  size="small"
                  color="success"
                  variant="outlined"
                  startIcon={<CheckCircleIcon />}
                  disabled
                  fullWidth
                >
                  Already in Graph
                </Button>
              )}
            </CardActions>
          </Card>
        )}
      </NodeExistence>
    );
  };

  // Render a card grid for module results
  const renderCardGrid = (cards: any[]) => {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
        {cards.map((card: any, index: number) => {
          const processedCard = processCardData(card);
          
          return (
            <Box 
              key={index} 
              sx={{ 
                width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.33% - 16px)' },
                transition: 'transform 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: '0 8px 16px rgba(0,0,0,0.1)'
                }
              }}
            >
              <NodeExistence card={card} investigationId={investigationId}>
                {(isChecking, isInGraph, recheckNode) => (
                  <Card
                    variant="outlined"
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      border: '1px solid',
                      borderColor: isInGraph ? 'success.main' : 'divider',
                      boxShadow: isInGraph ? '0 0 0 1px rgba(76, 175, 80, 0.5)' : '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                  >
                    <CardHeader
                      avatar={<EntityAvatar entity={{ type: processedCard.type }} />}
                      title={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle1" fontWeight={600} sx={{ mr: 1 }}>
                            {processedCard.title}
                          </Typography>
                          {processedCard.url && (
                            <IconButton
                              size="small"
                              component={Link}
                              href={processedCard.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              sx={{ 
                                p: 0.5,
                                color: 'primary.main',
                                '&:hover': { color: 'primary.dark' }
                              }}
                            >
                              <LaunchIcon fontSize="small" />
                            </IconButton>
                          )}
                        </Box>
                      }
                      subheader={processedCard.subtitle}
                      subheaderTypographyProps={{
                        variant: 'caption',
                        color: 'text.secondary'
                      }}
                      action={
                        isChecking ? (
                          <CircularProgress size={24} thickness={4} />
                        ) : isInGraph ? (
                          <Tooltip title="Already in investigation">
                            <CheckCircleIcon color="success" />
                          </Tooltip>
                        ) : null
                      }
                      sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: 'background.paper',
                        p: 2
                      }}
                    />
                    <CardActions sx={{ 
                      mt: 'auto',
                      borderTop: '1px solid',
                      borderColor: 'divider',
                      backgroundColor: 'background.paper',
                      p: 1,
                      justifyContent: 'center'
                    }}>
                      {!isInGraph ? (
                        <Button 
                          size="small" 
                          color="primary" 
                          startIcon={<AddIcon />}
                          onClick={() => {
                            const node = createNodeFromCard(card, selectedModule?.name);
                            onAddToGraph([node]);
                            notify(`Added ${processedCard.title} to investigation`, 'success');
                            // After adding to graph, recheck the node status
                            setTimeout(recheckNode, 500);
                          }}
                          sx={{ width: '100%' }}
                        >
                          Add to Graph
                        </Button>
                      ) : (
                        <Button
                          size="small"
                          color="success"
                          startIcon={<CheckCircleIcon />}
                          disabled
                          sx={{ width: '100%' }}
                        >
                          Already in Graph
                        </Button>
                      )}
                    </CardActions>
                  </Card>
                )}
              </NodeExistence>
            </Box>
          );
        })}
      </Box>
    );
  };

  // Loading state
  if (isLoadingModules) {
    return (
      <Card elevation={3} sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body1">Loading modules...</Typography>
      </Card>
    );
  }

  // Error state
  if (error && modules.length === 0) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Alert 
            severity="error" 
            action={
              <Button 
                onClick={loadModules} 
                color="inherit" 
                size="small"
                startIcon={<RefreshIcon />}
              >
            Retry
              </Button>
            }
          >
            <AlertTitle>Error</AlertTitle>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // No modules available
  if (modules.length === 0) {
    return (
      <Card elevation={3}>
        <CardContent>
          <Alert severity="info">
            <AlertTitle>No Modules</AlertTitle>
          No modules available.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={3}>
      {error && (
        <Box sx={{ p: 2 }}>
          <Alert 
            severity="error" 
            onClose={() => setError(null)}
          >
          {error}
          </Alert>
        </Box>
      )}
      
      <CardHeader
        title="Module Runner"
        action={
          result && (
            <Button
              variant="outlined"
              size="small"
              startIcon={<ArrowBackIcon />}
              onClick={() => setShowParameters(true)}
              sx={{ mr: 1 }}
            >
              Configure
            </Button>
          )
        }
        sx={{ 
          pb: 1,
          "& .MuiCardHeader-title": {
            fontSize: '1.25rem'
          }
        }}
      />

      <Divider />
      
      <CardContent>
        <FormControl fullWidth variant="outlined" size="small" sx={{ mb: 2 }}>
          <InputLabel id="module-select-label">Select a module</InputLabel>
          <Select
            labelId="module-select-label"
          id="module-select"
          value={selectedModule?.name || ''}
          onChange={(e) => selectModule(e.target.value)}
          disabled={isExecuting}
            label="Select a module"
        >
          {modules.map((module) => (
              <MenuItem key={module.name} value={module.name}>
                {module.display_name || module.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
          
        {selectedModule && showParameters && (
          <Box sx={{ mt: 2 }}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h6">{selectedModule.display_name || selectedModule.name}</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {selectedModule.description}
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Chip 
                  label={`v${selectedModule.version}`} 
                  size="small" 
                  variant="outlined" 
                />
                <Chip 
                  label={`by ${selectedModule.author}`} 
                  size="small" 
                  variant="outlined" 
                />
              </Stack>
            </Box>
            
            <Divider sx={{ mb: 3 }} />
          
          <Formik
            initialValues={generateInitialValues(selectedModule)}
            validationSchema={generateValidationSchema(selectedModule)}
            onSubmit={(values) => {
              const parsedValues = parseFormValues(values, selectedModule);
              executeModule(parsedValues);
            }}
            enableReinitialize
          >
            {({ errors, touched }) => (
                <Form>
                {selectedModule.required_params && selectedModule.required_params.length > 0 ? (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>Required Parameters</Typography>
                      <Stack spacing={2}>
                        {selectedModule.required_params.map((param) => (
                          <Box key={param.name}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2" fontWeight="500">
                        {param.name}
                              </Typography>
                      {param.description && (
                                <Tooltip title={param.description} arrow>
                                  <IconButton size="small" sx={{ ml: 0.5, p: 0 }}>
                                    <InfoIcon fontSize="small" color="action" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                            {renderParameterInput(param, errors, touched)}
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  ) : (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      No required parameters
                    </Typography>
                )}
                
                {selectedModule.optional_params && selectedModule.optional_params.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Typography variant="subtitle1" sx={{ mb: 1 }}>Optional Parameters</Typography>
                      <Stack spacing={2}>
                    {selectedModule.optional_params.map((param) => (
                          <Box key={param.name}>
                            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Typography variant="body2" fontWeight="500">
                                {param.name}
                              </Typography>
                        {param.description && (
                                <Tooltip title={param.description} arrow>
                                  <IconButton size="small" sx={{ ml: 0.5, p: 0 }}>
                                    <InfoIcon fontSize="small" color="action" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                            {renderParameterInput(param, errors, touched)}
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                  
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
                    <Button
                    type="submit"
                      variant="contained"
                    disabled={isExecuting}
                      startIcon={isExecuting ? <CircularProgress size={20} /> : <SearchIcon />}
                  >
                    {isExecuting ? 'Executing...' : 'Execute Module'}
                    </Button>
                  </Box>
              </Form>
            )}
          </Formik>
          </Box>
        )}
        
        {result && !showParameters && (
          <Box sx={{ mt: 2 }}>
          {result.status === 'error' ? (
              <Alert severity="error" variant="outlined" sx={{ mb: 2 }}>
                <AlertTitle>Error</AlertTitle>
                {result.error}
              </Alert>
            ) : (
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="h6">Results</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(result.timestamp).toLocaleString()}
                  </Typography>
                </Box>
                
                {/* Generic module result display */}
                <Box>
                  {result.data && (
                    <>
                      {/* Show common data fields */}
                      {result.data.message && (
                        <Alert severity="info" variant="outlined" sx={{ mb: 2 }}>
                          {result.data.message}
                        </Alert>
                      )}
                      
                      {/* Display node data if available */}
                      {result.data.nodes && result.data.nodes.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SearchIcon fontSize="small" />
                            Nodes Found: {result.data.nodes.length}
                          </Typography>
                          <Stack spacing={1.5}>
                            {result.data.nodes.map((node: any, index: number) => (
                              <Paper key={index} variant="outlined" sx={{ 
                                p: 2,
                                borderRadius: '6px',
                                transition: 'transform 0.2s ease-in-out',
                                '&:hover': {
                                  transform: 'translateY(-2px)',
                                  boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
                                },
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 0.5,
                                border: '1px solid',
                                borderColor: 'divider'
                              }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                  <EntityAvatar entity={{type: node.type, platform: node.data?.platform}} size={32} />
                                  <Typography variant="subtitle2" fontWeight={600} color="primary.main">
                                    {node.name}
                                  </Typography>
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                                  <Chip 
                                    label={node.type} 
                                    size="small" 
                                    sx={{ 
                                      bgcolor: 'primary.light', 
                                      color: 'primary.contrastText',
                                      fontWeight: 500,
                                      fontSize: '0.75rem'
                                    }} 
                                  />
                                </Box>
                                {node.url && (
                                  <Link 
                                    href={node.url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    sx={{ 
                                      display: 'flex', 
                                      alignItems: 'center', 
                                      mt: 0.5,
                                      color: 'primary.main',
                                      fontWeight: 500,
                                      fontSize: '0.875rem',
                                      '&:hover': {
                                        textDecoration: 'underline'
                                      }
                                    }}
                                  >
                                    View Details
                                    <LaunchIcon fontSize="small" sx={{ ml: 0.5, fontSize: '0.875rem' }} />
                                  </Link>
                                )}
                              </Paper>
                            ))}
                          </Stack>
                        </Paper>
                      )}
                      
                      {/* Display data items in a generic way (for any module) */}
                      {result.data.items && result.data.items.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                          <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 600, color: 'primary.main' }}>
                            Items Found: {result.data.items.length}
                          </Typography>
                          
                          {result.data.search_query && (
                            <Chip 
                              label={`Query: "${result.data.search_query}"`} 
                              size="small" 
                              sx={{ mb: 1, backgroundColor: 'primary.light', color: 'primary.contrastText' }}
                            />
                          )}
                          
                          {result.data.stats && (
                            <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 0.8 }}>
                              {Object.entries(result.data.stats).map(([key, value]) => (
                                <Chip 
                                  key={key} 
                                  label={`${key}: ${String(value)}`} 
                                  size="small" 
                                  variant="outlined" 
                                  sx={{ backgroundColor: 'background.paper', borderColor: 'primary.light' }}
                                />
                              ))}
                            </Box>
                          )}
                          
                          <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1, gap: 1 }}>
                            {result.data.items.map((item: any, index: number) => (
                              <Box 
                                key={index} 
                                sx={{ 
                                  width: { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.33% - 16px)' }, 
                                  p: 1,
                                  transition: 'transform 0.2s ease-in-out',
                                  '&:hover': {
                                    transform: 'translateY(-4px)'
                                  }
                                }}
                              >
                                <Card variant="outlined" sx={{ 
                                  borderRadius: '8px', 
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                  overflow: 'hidden',
                                  border: '1px solid',
                                  borderColor: 'divider'
                                }}>
                                  <CardHeader
                                    avatar={<EntityAvatar entity={item} />}
                                    title={item.title || 'No Title'}
                                    titleTypographyProps={{ 
                                      variant: 'subtitle2', 
                                      fontWeight: 600,
                                      color: 'text.primary'
                                    }}
                                    sx={{
                                      backgroundColor: 'background.paper',
                                      borderBottom: '1px solid',
                                      borderColor: 'divider'
                                    }}
                                    action={
                                      item.url && (
                                        <IconButton 
                                          href={item.url} 
                                          target="_blank" 
                                          rel="noopener noreferrer"
                                          size="small"
                                          aria-label="Open link"
                                          sx={{ color: 'primary.main' }}
                                        >
                                          <LaunchIcon fontSize="small" />
                                        </IconButton>
                                      )
                                    }
                                  />
                                  <CardContent sx={{ pt: 1, px: 2, pb: '16px !important' }}>
                                    <Stack spacing={0.8}>
                                      {Object.entries(item)
                                        .filter(([k]) => k !== 'title' && k !== 'url')
                                        .map(([key, value]) => (
                                          <Box key={key} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <Typography variant="body2" fontWeight={500} color="text.secondary" sx={{ minWidth: '80px' }}>
                                              {key}:
                                            </Typography>
                                            <Typography variant="body2" color="text.primary">
                                              {String(value || '')}
                                            </Typography>
                                          </Box>
                                        ))}
                                    </Stack>
                                  </CardContent>
                                </Card>
                              </Box>
                            ))}
                          </Box>
                        </Paper>
                      )}
                      
                      {/* Display card collection format - generic approach for all modules */}
                      {result.data.display && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                          <Typography variant="h6" sx={{ fontWeight: 600, color: 'primary.main', mb: 1 }}>
                            {result.data.display.title || 'Results'}
                          </Typography>
                          
                          {result.data.display.subtitle && (
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                              {result.data.display.subtitle}
                            </Typography>
                          )}
                          
                          {/* Render different display formats based on type */}
                          {result.data.display.type === 'card_collection' && result.data.display.cards && result.data.display.cards.length > 0 && (
                            renderCardGrid(result.data.display.cards)
                          )}
                          
                          {result.data.display.type === 'single_card' && result.data.display.card && (
                            renderSingleCard(result.data.display.card)
                          )}
                          
                          {result.data.display.type === 'simple_text' && result.data.display.text && (
                            <Typography variant="body1" sx={{ mt: 2, p: 2, bgcolor: 'background.paper', borderRadius: '4px' }}>
                              {result.data.display.text}
                            </Typography>
                          )}
                          
                          {(!result.data.display.type || 
                            (result.data.display.type === 'card_collection' && (!result.data.display.cards || result.data.display.cards.length === 0)) ||
                            (result.data.display.type === 'single_card' && !result.data.display.card)) && (
                              <Alert severity="info" sx={{ mt: 1 }}>
                                No results to display
                              </Alert>
                            )}
                        </Paper>
                      )}
                      
                      {/* Display raw data if no specialized display is available */}
                      {!result.data.message && !result.data.nodes && !result.data.items && 
                       !(result.data.display && result.data.display.type === 'card_collection') && (
                        <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: '8px', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>
                          <Typography variant="subtitle1" sx={{ mb: 1.5, fontWeight: 600, color: 'primary.main', display: 'flex', alignItems: 'center', gap: 1 }}>
                            <InfoIcon fontSize="small" />
                            Raw Result Data
                          </Typography>
                          <Paper 
                            sx={{ 
                              p: 2, 
                              backgroundColor: 'grey.50', 
                              overflowX: 'auto',
                              fontFamily: 'monospace',
                              fontSize: '0.875rem',
                              borderRadius: '6px',
                              border: '1px solid',
                              borderColor: 'divider'
                            }}
                          >
                            <pre style={{ margin: 0, overflow: 'auto', maxHeight: '300px' }}>
                              {JSON.stringify(result.data, null, 2)}
                            </pre>
                          </Paper>
                        </Paper>
                      )}
                    </>
                  )}
                </Box>
                
                {/* Add to graph button for compatible results - hide for card collections */}
                {((result.data?.items && result.data.items.length > 0) || 
                  (result.data?.nodes && result.data.nodes.length > 0) ||
                  (result.data?.display?.card) ||
                  (result.data?.display?.text)) && 
                  // Don't show for card collections
                  !(result.data?.display?.type === 'card_collection' && result.data?.display?.cards) && (
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                    <Button
                      onClick={handleAddToGraph}
                      variant="contained"
                      startIcon={<AddIcon />}
                      color="success"
                      sx={{
                        borderRadius: '28px',
                        px: 3,
                        py: 1,
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 4px 8px rgba(76, 175, 80, 0.25)',
                        '&:hover': {
                          boxShadow: '0 6px 12px rgba(76, 175, 80, 0.35)',
                        }
                      }}
                    >
                      Add to Graph
                    </Button>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ModuleRunner;
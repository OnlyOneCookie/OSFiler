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
  MenuItem,
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

interface ResultCard {
  title: string;
  subtitle?: string;
  url?: string;
  body?: string;
  data: any;
  action?: any;
  show_properties?: boolean;
  icon?: string;
  image?: string;
}

interface ModuleResult {
  nodes: ResultCard[];
  display: 'single_card' | 'card_collection';
    title?: string;
    subtitle?: string;
}

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
    const hasImageFile = module.required_params.some(p => p.name === 'image_file');
    const hasImageUrl = module.required_params.some(p => p.name === 'image_url');
    if (hasImageFile && hasImageUrl) {
      schemaFields['image_file'] = Yup.mixed().test(
        'file-or-url',
        'Either image file or image URL must be provided',
        function (value) {
          const { image_url } = this.parent;
          return (value && value instanceof File && value.size > 0) || !!image_url;
        }
      );
      schemaFields['image_url'] = Yup.string().test(
        'url-or-file',
        'Either image file or image URL must be provided',
        function (value) {
          const { image_file } = this.parent;
          return !!value || (image_file && image_file instanceof File && image_file.size > 0);
        }
      );
    }
    (module.required_params || []).forEach(param => {
      if (param.name === 'image_file' || param.name === 'image_url') return;
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
    (module.optional_params || []).forEach(param => {
      if (param.name === 'image_file' || param.name === 'image_url') return;
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
    (module.required_params || []).forEach(param => {
      if (param.name === 'image_file') {
        initialValues[param.name] = undefined;
      } else if (param.name === 'image_url') {
        initialValues[param.name] = '';
      } else {
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
      }
    });
    (module.optional_params || []).forEach(param => {
      if (param.name === 'image_file' || param.name === 'image_url') return;
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

  const ResultsSection = ({ result, investigationId, onAddToGraph }: { result: ModuleResult, investigationId: string, onAddToGraph: (nodes: any[]) => void }) => {
    if (!result?.nodes?.length) {
      return (
        <Card variant="outlined" sx={{ mt: 3, borderRadius: 2 }}>
          <CardHeader title="Results" />
          <Divider />
          <CardContent>
            <Typography variant="body2" color="text.secondary" paragraph>
              No results to display.
            </Typography>
          </CardContent>
        </Card>
      );
    }
    const isSingleCard = result.display === 'single_card' && result.nodes.length === 1;
    return (
      <Card variant="outlined" sx={{ mt: 3, borderRadius: 2 }}>
        <CardHeader title={result.title || 'Results'} />
        <Divider />
        <CardContent>
          {result.subtitle && (
            <Typography variant="body2" color="text.secondary" paragraph>
              {result.subtitle}
            </Typography>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
            {result.nodes.map((card, idx) => (
              <NodeExistence
                key={idx}
                card={card}
                investigationId={investigationId}
              >
                {(isChecking, isInGraph, recheckNode) => (
                  <ResultCardComponent
                    card={card}
                    isChecking={isChecking}
                    recheckNode={recheckNode}
                    onAddToGraph={onAddToGraph}
                    investigationId={investigationId}
                    fullWidth={isSingleCard}
                  />
                )}
              </NodeExistence>
            ))}
          </Box>
        </CardContent>
      </Card>
    );
  };

  const ResultCardComponent = ({ card, isChecking, recheckNode, onAddToGraph, investigationId, fullWidth }: { card: ResultCard, isChecking?: boolean, recheckNode?: () => void, onAddToGraph?: (nodes: any[]) => void, investigationId: string, fullWidth?: boolean }) => {
    const { notify } = useNotification();
    const shownFields = ["title", "subtitle", "url", "body", "action"];
    const detailFields = Object.entries(card.data || {})
      .filter(([key]) => !shownFields.includes(key))
      .map(([key, value]) => ({ key, value }));
    const showProperties = card.show_properties !== false;
    return (
      <Card
        variant="outlined"
        sx={{
          width: fullWidth ? '100%' : { xs: '100%', sm: 'calc(50% - 16px)', md: 'calc(33.33% - 16px)' },
          maxWidth: fullWidth ? 'none' : 420,
          borderRadius: '12px',
          overflow: 'hidden',
          border: '1.5px solid',
          display: 'flex',
          flexDirection: 'column',
          mb: 2,
          background: '#fff',
          transition: 'box-shadow 0.2s',
          '&:hover': {
            boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
            borderColor: 'primary.main',
          },
        }}
      >
        {card.image && (
          <CardMedia
            component="img"
            image={card.image}
            alt={card.title}
            sx={{ width: '100%', maxHeight: 220, objectFit: 'contain', background: '#f5f5f5' }}
          />
        )}
        <CardHeader
          avatar={(!card.image && card.icon) ? getDynamicIcon(card.icon, { style: { width: 44, height: 44 } }) : (!card.image ? <EntityAvatar entity={card.data} size={44} /> : undefined)}
          title={<Typography variant="h6" fontWeight={700}>{card.title}</Typography>}
          subheader={card.subtitle && <Typography variant="subtitle2" color="text.secondary">{card.subtitle}</Typography>}
          action={card.url ? (
            <Tooltip title="Open link in new tab">
              <IconButton href={card.url} target="_blank" rel="noopener noreferrer" color="primary">
                <LaunchIcon fontSize="medium" />
              </IconButton>
            </Tooltip>
          ) : null}
          sx={{ pb: 0, alignItems: 'flex-start' }}
        />
        <CardContent sx={{ pt: 1, pb: 1 }}>
          {card.body && (
            <Typography variant="body2" color="text.primary" sx={{ mb: showProperties && detailFields.length ? 1 : 0 }}>
              {card.body}
            </Typography>
          )}
          {showProperties && detailFields.length > 0 && (
            <Stack spacing={0.5} sx={{ mt: 0.5 }}>
              {detailFields.map(({ key, value }) => (
                <Typography key={key} variant="body2" color="text.secondary">
                  <b>{key}:</b> {String(value)}
                </Typography>
              ))}
            </Stack>
          )}
        </CardContent>
        <CardActions sx={{ mt: 'auto', p: 1, justifyContent: 'center', borderTop: '1px solid', borderColor: 'divider', background: '#fafbfc' }}>
          <NodeExistence card={card} investigationId={investigationId}>
            {(checking, exists, recheck) =>
              checking ? (
                <Button
                  size="small"
                  color="inherit"
                  startIcon={<CircularProgress size={18} />}
                  disabled
                  sx={{ width: '100%', fontWeight: 600, borderRadius: 2 }}
                  variant="outlined"
                >
                  Checking...
                </Button>
              ) : !exists && card.action ? (
                <Button
                  size="small"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    onAddToGraph && onAddToGraph([
                      {
                        type: card.action?.node_type || 'CUSTOM',
                        name: card.data.name || card.title || card.subtitle || 'Unnamed Node',
                        data: card.data
                      }
                    ]);
                    notify(`Added ${card.title} to investigation`, 'success');
                    if (recheck) setTimeout(recheck, 500); // Only recheck this card
                  }}
                  sx={{ width: '100%', fontWeight: 600, borderRadius: 2 }}
                  variant="contained"
                >
                  {card.action.label || 'Add to Graph'}
                </Button>
              ) : (
                <Button
                  size="small"
                  color="success"
                  startIcon={<CheckCircleIcon />}
                  disabled
                  sx={{ width: '100%', fontWeight: 600, borderRadius: 2 }}
                  variant="outlined"
                >
                  Already in Graph
                </Button>
              )
            }
          </NodeExistence>
        </CardActions>
      </Card>
    );
  };

  // Move renderParameterInput above its first usage
  const renderParameterInput = (param: any, errors: any, touched: any, setFieldValue: any, values: any) => {
    const fieldId = `param-${param.name}`;
    const hasError = errors[param.name] && touched[param.name];
    switch (param.type) {
      case 'file':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <input
              id={fieldId}
              name={param.name}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => {
                setFieldValue(param.name, e.currentTarget.files && e.currentTarget.files[0]);
              }}
              disabled={Boolean(param.name === 'image_file' && values['image_file'])}
            />
            <label htmlFor={fieldId}>
              <Button
                variant="outlined"
                color="primary"
                component="span"
                size="small"
                disabled={Boolean(param.name === 'image_file' && values['image_file'])}
              >
                Choose File
              </Button>
            </label>
            <Typography variant="body2" sx={{ minWidth: 0, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {values[param.name]?.name || 'No file chosen'}
            </Typography>
          </Box>
        );
      case 'boolean':
        return (
          <FormControlLabel
            control={
              <Field as={Checkbox} id={fieldId} name={param.name} color="primary" />
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
            helperText={hasError ? <ErrorMessage name={param.name} /> : 'Enter values separated by commas'}
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
            helperText={hasError ? <ErrorMessage name={param.name} /> : 'Enter valid JSON object'}
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
            disabled={Boolean(param.name === 'image_file' && values['image_file'])}
          />
        );
      default:
        return null;
    }
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
    <>
      {/* Module Runner Section */}
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
              {({ errors, touched, setFieldValue, values }) => {
                console.log('Formik values:', values);
                return (
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
                              {renderParameterInput(param, errors, touched, setFieldValue, values)}
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
                              {renderParameterInput(param, errors, touched, setFieldValue, values)}
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
                );
              }}
            </Formik>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* Results Section - separate card below */}
      {result && !showParameters && (
        (result.data && Array.isArray(result.data.nodes) && typeof result.data.display === 'string') ? (
          <ResultsSection result={result.data as ModuleResult} investigationId={investigationId} onAddToGraph={onAddToGraph} />
        ) : null
      )}
    </>
  );
};

export default ModuleRunner;
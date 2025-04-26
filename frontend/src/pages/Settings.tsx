/**
 * Settings page component for OSFiler.
 * 
 * This component provides a UI for administrators to configure
 * application-wide settings and module configurations.
 */

import React, { useState, useEffect } from 'react';
import { Formik, Form } from 'formik';
import * as Yup from 'yup';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api';
import { Navigate } from 'react-router-dom';
import { TypeWithDescription } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

// Material UI imports
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  TextField,
  Typography,
  IconButton,
  List,
  ListItem,
  ListItemText,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tab,
  Tabs,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  DialogContentText,
  CircularProgress,
  ListItemIcon,
  SelectChangeEvent,
  Switch,
  FormControlLabel,
  FormGroup,
  Tooltip,
  InputAdornment,
  OutlinedInput
} from '@mui/material';

// Material UI icons
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import CancelIcon from '@mui/icons-material/Cancel';
import ExtensionIcon from '@mui/icons-material/Extension';
import CategoryIcon from '@mui/icons-material/Category';
import LinkIcon from '@mui/icons-material/Link';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';

interface ModuleConfig {
  [key: string]: any;
}

interface ModuleInfo {
  name: string;
  description: string;
  has_config: boolean | string;
  display_name?: string;
  version?: string;
}

// Settings tabs
type SettingsTab = 'general' | 'modules';

interface Type {
  id?: string;
  value: string;
  entity_type?: 'node' | 'relationship';
  description?: string;
  is_system?: boolean;
  created_at?: string;
  updated_at?: string;
}

// Type for the edit modal form
interface TypeForm {
  value: string;
  description: string;
}

/**
 * Formats type values to be all uppercase with underscores instead of spaces
 * @param value The type value to format
 * @returns The formatted type value
 */
const formatTypeValue = (value: string): string => {
  return value.trim().toUpperCase().replace(/\s+/g, '_');
};

/**
 * Formats type values during input (uppercase + replace spaces between words)
 * but allows trailing/leading spaces during editing
 * @param value The type value being entered
 * @returns The partially formatted value (uppercase with middle spaces as underscores)
 */
const formatTypeValueForInput = (value: string): string => {
  // Convert to uppercase
  const uppercaseValue = value.toUpperCase();
  
  // Only replace spaces that are between characters (not leading/trailing)
  // This regex finds spaces that have a non-space character on both sides
  return uppercaseValue.replace(/(?<=\S)\s+(?=\S)/g, '_');
};

/**
 * Settings page component.
 * 
 * @returns The Settings page component.
 */
const Settings: React.FC = () => {
  // Auth state
  const { user } = useAuth();
  
  // Settings state
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [configuredModules, setConfiguredModules] = useState<Record<string, ModuleConfig>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const { notify } = useNotification();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [moduleSearchTerm, setModuleSearchTerm] = useState<string>('');
  
  // General settings state
  const [nodeTypes, setNodeTypes] = useState<Type[]>([]);
  const [relationshipTypes, setRelationshipTypes] = useState<Type[]>([]);
  const [nodeTypesEditMode, setNodeTypesEditMode] = useState<boolean>(false);
  const [relationshipTypesEditMode, setRelationshipTypesEditMode] = useState<boolean>(false);
  const [editTypeModalOpen, setEditTypeModalOpen] = useState<boolean>(false);
  const [addTypeModalOpen, setAddTypeModalOpen] = useState<boolean>(false);
  const [currentTypeEntity, setCurrentTypeEntity] = useState<'node' | 'relationship'>('node');
  const [currentTypeIndex, setCurrentTypeIndex] = useState<number>(-1);
  const [currentTypeForm, setCurrentTypeForm] = useState<TypeForm>({ value: '', description: '' });
  const [confirmDialogOpen, setConfirmDialogOpen] = useState<boolean>(false);
  const [dialogAction, setDialogAction] = useState<{type: string, action: () => void} | null>(null);
  
  // Filter state
  const [showSystemTypes, setShowSystemTypes] = useState<boolean>(false);
  const [filteredNodeTypes, setFilteredNodeTypes] = useState<Type[]>([]);
  const [filteredRelationshipTypes, setFilteredRelationshipTypes] = useState<Type[]>([]);

  // Tab handling
  const handleTabChange = (event: React.SyntheticEvent, newValue: SettingsTab) => {
    setActiveTab(newValue);
    
    // When switching to modules tab, ensure modules are loaded
    if (newValue === 'modules' && modules.length === 0) {
      fetchModules();
    }
  };

  useEffect(() => {
    if (user?.is_admin) {
      fetchModules();
    }
  }, [user]);

  useEffect(() => {
    if (activeTab === 'general') {
      loadNodeTypes();
      loadRelationshipTypes();
    }
  }, [activeTab]);

  // Filter types based on showSystemTypes toggle
  useEffect(() => {
    setFilteredNodeTypes(nodeTypes.filter(type => showSystemTypes || !type.is_system));
    setFilteredRelationshipTypes(relationshipTypes.filter(type => showSystemTypes || !type.is_system));
  }, [nodeTypes, relationshipTypes, showSystemTypes]);

  const toggleShowSystemTypes = () => {
    setShowSystemTypes(!showSystemTypes);
  };

  const fetchModules = async () => {
    try {
      setLoading(true);
      
      // Get all available modules
      const modulesList = await apiService.getModules();
      
      // Check if modulesList is empty or not an array
      if (!modulesList || !Array.isArray(modulesList)) {
        console.error("Error: Module list is not an array or is empty");
        throw new Error("Failed to get module list - received invalid data");
      }
      
      setModules(modulesList);
      
      // Filter modules that have configuration
      const modulesWithConfig = modulesList.filter(m => {
        // More robust checking of the has_config value
        return m.has_config === true || 
               (typeof m.has_config === 'string' && m.has_config.toLowerCase() === 'true');
      });
      
      setConfiguredModules(modulesWithConfig.reduce((acc, module) => ({
        ...acc,
        [module.name]: module.has_config === true ? {} : module.has_config
      }), {}));
      
      // No auto-selection of modules
      setActiveModule('');
    } catch (err: any) {
      console.error("Error loading modules:", err);
      
      // Log meaningful error information
      if (err.response) {
        console.error(`Server error ${err.response.status}: ${err.response.data?.detail || 'Unknown error'}`);
      }
      
      notify(err.message || 'Failed to load modules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveModuleConfig = async (values: { config: string }) => {
    if (!activeModule) return;
    
    try {
      setLoading(true);
      
      // Parse JSON string to object
      const newConfig = JSON.parse(values.config);
      
      // Save configuration
      const result = await apiService.updateModuleConfig(activeModule, newConfig);
      
      if (result.status === 'success') {
        notify(`Configuration for module ${activeModule} saved successfully`, 'success');
        setConfiguredModules(prev => ({
          ...prev,
          [activeModule]: newConfig
        }));
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (err: any) {
      console.error('Error saving module configuration:', err);
      notify(`Failed to save configuration: ${err.message || 'Unknown error'}`, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleModuleSelect = async (event: SelectChangeEvent<string>) => {
    const moduleName = event.target.value;
    setActiveModule(moduleName);
    
    if (!moduleName) {
      setConfiguredModules({});
      return;
    }
    
    try {
      // Always load fresh config when selecting a module
      setLoading(true);
      
      // Get module configuration using the generic endpoint
      const moduleConfigData = await apiService.getModuleConfig(moduleName);
      
      if (moduleConfigData && moduleConfigData.config) {
        setConfiguredModules(prev => ({
          ...prev,
          [moduleName]: moduleConfigData.config
        }));
        console.log("Loaded config:", moduleConfigData.config);
      } else {
        console.warn(`Module ${moduleName} configuration is empty or undefined`);
        setConfiguredModules(prev => ({
          ...prev,
          [moduleName]: {}
        }));
      }
    } catch (err: any) {
      console.error(`Error loading configuration for module ${moduleName}:`, err);
      notify(`Failed to load module configuration: ${err.message || 'Unknown error'}`, 'error');
      setConfiguredModules({});
    } finally {
      setLoading(false);
    }
  };

  const loadNodeTypes = async () => {
    setLoading(true);
    
    try {
      const data = await apiService.getGlobalNodeTypes();
      setNodeTypes(data);
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to load node types', 'error');
      console.error('Error loading node types:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadRelationshipTypes = async () => {
    setLoading(true);
    
    try {
      const data = await apiService.getGlobalRelationshipTypes();
      setRelationshipTypes(data);
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to load relationship types', 'error');
      console.error('Error loading relationship types:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveNodeTypes = async (types: TypeWithDescription[]) => {
    setLoading(true);
    
    try {
      await apiService.updateNodeTypes(types);
      setNodeTypes(types);
      notify('Node types saved successfully', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to save node types', 'error');
      console.error('Error saving node types:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveRelationshipTypes = async (types: TypeWithDescription[]) => {
    setLoading(true);
    
    try {
      await apiService.updateRelationshipTypes(types);
      setRelationshipTypes(types);
      notify('Relationship types saved successfully', 'success');
    } catch (err: any) {
      notify(err.response?.data?.detail || 'Failed to save relationship types', 'error');
      console.error('Error saving relationship types:', err);
    } finally {
      setLoading(false);
    }
  };

  // Toggle edit mode for node types
  const toggleNodeTypesEditMode = () => {
    setNodeTypesEditMode(!nodeTypesEditMode);
    if (nodeTypesEditMode) {
      notify('Node types edit mode disabled', 'info');
    } else {
      notify('Node types edit mode enabled', 'info');
    }
  };

  // Toggle edit mode for relationship types
  const toggleRelationshipTypesEditMode = () => {
    setRelationshipTypesEditMode(!relationshipTypesEditMode);
    if (relationshipTypesEditMode) {
      notify('Relationship types edit mode disabled', 'info');
    } else {
      notify('Relationship types edit mode enabled', 'info');
    }
  };

  // Module reload handlers
  const handleReloadModule = async (moduleName?: string) => {
    // Use provided moduleName or fall back to activeModule
    const moduleToReload = moduleName || activeModule;
    
    if (!moduleToReload) {
      notify('Please select a module to reload', 'error');
      return;
    }
    
    try {
      setLoading(true);
      const result = await apiService.reloadModule(moduleToReload);
      notify(result.message || `Module ${moduleToReload} reloaded successfully`, 'success');
      
      // Refresh module list and config
      await fetchModules();
      
      // If we're reloading the currently active module in the config editor, refresh its config
      if (activeModule && moduleToReload === activeModule) {
        const moduleConfigData = await apiService.getModuleConfig(activeModule);
        if (moduleConfigData && moduleConfigData.config) {
          setConfiguredModules(prev => ({
            ...prev,
            [activeModule]: moduleConfigData.config
          }));
        }
      }
    } catch (err: any) {
      console.error(`Error reloading module ${moduleToReload}:`, err);
      notify(err.response?.data?.detail || `Failed to reload module ${moduleToReload}`, 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const handleReloadAllModules = async () => {
    try {
      setLoading(true);
      const result = await apiService.reloadAllModules();
      notify(result.message || 'All modules reloaded successfully', 'success');
      
      // Refresh module list
      await fetchModules();
    } catch (err: any) {
      console.error('Error reloading all modules:', err);
      notify(err.response?.data?.detail || 'Failed to reload all modules', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditTypeModal = (entityType: 'node' | 'relationship', index: number) => {
    const types = entityType === 'node' ? nodeTypes : relationshipTypes;
    const type = types[index];
    
    // Don't allow editing system types
    if (type.is_system) {
      notify(`Cannot edit system ${entityType} type`, 'error');
      return;
    }
    
    setCurrentTypeEntity(entityType);
    setCurrentTypeIndex(index);
    
    setCurrentTypeForm({
      value: type.value,
      description: type.description || ''
    });
    
    setEditTypeModalOpen(true);
  };

  const handleOpenAddTypeModal = (entityType: 'node' | 'relationship') => {
    setCurrentTypeEntity(entityType);
    setCurrentTypeForm({ value: '', description: '' });
    setAddTypeModalOpen(true);
  };

  const handleCloseTypeModals = () => {
    setEditTypeModalOpen(false);
    setAddTypeModalOpen(false);
  };

  const handleTypeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    // If this is the "value" field, apply partial formatting
    if (name === 'value') {
      setCurrentTypeForm(prev => ({
        ...prev,
        [name]: formatTypeValueForInput(value)
      }));
    } else {
      setCurrentTypeForm(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleDeleteConfirmation = (type: string, index: number) => {
    const types = type === 'node' ? nodeTypes : relationshipTypes;
    const typeObj = types[index];
    
    // Don't allow deleting system types
    if (typeObj.is_system) {
      notify(`Cannot delete system ${type} type`, 'error');
      return;
    }
    
    setConfirmDialogOpen(true);
    setCurrentTypeEntity(type === 'node' ? 'node' : 'relationship');
    setCurrentTypeIndex(index);
    setDialogAction({
      type,
      action: () => {
        if (type === 'node') {
          const updatedTypes = [...nodeTypes];
          updatedTypes.splice(index, 1);
          saveNodeTypes(updatedTypes);
        } else {
          const updatedTypes = [...relationshipTypes];
          updatedTypes.splice(index, 1);
          saveRelationshipTypes(updatedTypes);
        }
        setConfirmDialogOpen(false);
      }
    });
  };

  const confirmDelete = () => {
    if (dialogAction) {
      dialogAction.action();
      
      // Get the type that was deleted
      const types = currentTypeEntity === 'node' ? nodeTypes : relationshipTypes;
      if (currentTypeIndex >= 0 && currentTypeIndex < types.length) {
        const deletedType = types[currentTypeIndex];
        notify(`${currentTypeEntity === 'node' ? 'Node' : 'Relationship'} type "${deletedType.value}" deleted successfully`, 'success');
      }
      
      setDialogAction(null);
    }
  };

  const cancelDelete = () => {
    setConfirmDialogOpen(false);
  };

  const handleSaveTypeEdit = () => {
    if (!currentTypeForm.value.trim()) return;
    
    // Format the type value (uppercase, trimmed)
    const formattedValue = formatTypeValue(currentTypeForm.value);
    
    if (currentTypeEntity === 'node') {
      const updatedTypes = [...nodeTypes];
      updatedTypes[currentTypeIndex] = {
        ...updatedTypes[currentTypeIndex],
        value: formattedValue,
        description: currentTypeForm.description
      };
      
      saveNodeTypes(updatedTypes);
      notify(`Node type "${formattedValue}" updated successfully`, 'success');
    } else {
      const updatedTypes = [...relationshipTypes];
      updatedTypes[currentTypeIndex] = {
        ...updatedTypes[currentTypeIndex],
        value: formattedValue,
        description: currentTypeForm.description
      };
      
      saveRelationshipTypes(updatedTypes);
      notify(`Relationship type "${formattedValue}" updated successfully`, 'success');
    }
    
    handleCloseTypeModals();
  };

  const handleAddType = () => {
    if (!currentTypeForm.value.trim()) return;
    
    // Format the type value (uppercase, trimmed)
    const formattedValue = formatTypeValue(currentTypeForm.value);
    
    // Check if the type already exists
    const typesArray = currentTypeEntity === 'node' ? nodeTypes : relationshipTypes;
    const exists = typesArray.some(t => t.value === formattedValue);
    
    if (exists) {
      notify(`Type "${formattedValue}" already exists`, 'warning');
      return;
    }
    
    if (currentTypeEntity === 'node') {
      const updatedTypes = [...nodeTypes, {
        value: formattedValue,
        description: currentTypeForm.description,
        entity_type: 'node'
      }];
      saveNodeTypes(updatedTypes);
      notify(`Node type "${formattedValue}" added successfully`, 'success');
    } else {
      const updatedTypes = [...relationshipTypes, {
        value: formattedValue,
        description: currentTypeForm.description,
        entity_type: 'relationship'
      }];
      saveRelationshipTypes(updatedTypes);
      notify(`Relationship type "${formattedValue}" added successfully`, 'success');
    }
    
    handleCloseTypeModals();
  };

  // Redirect if not admin
  if (!user?.is_admin) {
    return <Navigate to="/dashboard" />;
  }

  if (loading && modules.length === 0) {
    return (
      <div className="settings-page">
        <div className="loading-spinner">Loading settings...</div>
      </div>
    );
  }

  return (
    <Box className="settings-container" sx={{ p: 3, maxWidth: '1200px', margin: '0 auto' }}>
      <Typography variant="h4" component="h1" gutterBottom sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <SettingsIcon sx={{ mr: 1 }} /> Settings
      </Typography>

      {loading && (
        <Box display="flex" justifyContent="center" my={4}>
          <CircularProgress />
        </Box>
      )}

      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ mb: 3, borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab value="general" label="General Settings" />
        <Tab value="modules" label="Module Configuration" />
      </Tabs>

      {/* Edit Type Modal */}
      <Dialog open={editTypeModalOpen} onClose={handleCloseTypeModals} maxWidth="sm" fullWidth>
        <DialogTitle>
          Edit {currentTypeEntity === 'node' ? 'Node' : 'Relationship'} Type
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Type Value"
              name="value"
              value={currentTypeForm.value}
              onChange={handleTypeInputChange}
              fullWidth
              margin="normal"
              required
              helperText="Values will be automatically capitalized. Leading/trailing spaces will be removed when saving."
              inputProps={{
                style: { textTransform: 'uppercase' }
              }}
            />
            <TextField
              label="Description"
              name="description"
              value={currentTypeForm.description}
              onChange={handleTypeInputChange}
              fullWidth
              margin="normal"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTypeModals}>Cancel</Button>
          <Button 
            onClick={handleSaveTypeEdit} 
            color="primary" 
            variant="contained"
            disabled={!currentTypeForm.value.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Type Modal */}
      <Dialog open={addTypeModalOpen} onClose={handleCloseTypeModals} maxWidth="sm" fullWidth>
        <DialogTitle>
          Add New {currentTypeEntity === 'node' ? 'Node' : 'Relationship'} Type
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              label="Type Value"
              name="value"
              value={currentTypeForm.value}
              onChange={handleTypeInputChange}
              fullWidth
              margin="normal"
              required
              helperText="Values will be automatically capitalized. Leading/trailing spaces will be removed when saving."
              inputProps={{
                style: { textTransform: 'uppercase' }
              }}
            />
            <TextField
              label="Description"
              name="description"
              value={currentTypeForm.description}
              onChange={handleTypeInputChange}
              fullWidth
              margin="normal"
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTypeModals}>Cancel</Button>
          <Button 
            onClick={handleAddType} 
            color="primary" 
            variant="contained"
            disabled={!currentTypeForm.value.trim()}
          >
            Add
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={cancelDelete}
      >
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this {currentTypeEntity === 'node' ? 'node' : 'relationship'} type?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={cancelDelete}>Cancel</Button>
          <Button onClick={confirmDelete} color="error">Delete</Button>
        </DialogActions>
      </Dialog>

      {activeTab === 'general' && (
        <Box>
          <Typography variant="h5" gutterBottom>General Settings</Typography>
          
          {/* Filter Controls */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <FilterListIcon sx={{ mr: 1 }} />
                <Typography variant="h6">Filters</Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              
              <FormGroup>
                <FormControlLabel 
                  control={
                    <Switch 
                      checked={showSystemTypes} 
                      onChange={toggleShowSystemTypes} 
                    />
                  } 
                  label="Show System Types" 
                />
              </FormGroup>
            </CardContent>
          </Card>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', mx: -1.5 }}>
            <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1.5 }}>
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardHeader 
                  title="Node Types"
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Configure the available node types for investigations. These types will be available when creating new nodes.
                  </Typography>
                  
                  <List>
                    {filteredNodeTypes.length > 0 ? (
                      filteredNodeTypes.map((type, index) => {
                        // Find the original index in the full nodeTypes array
                        const originalIndex = nodeTypes.findIndex(t => t.id === type.id);
                        return (
                        <ListItem
                          key={type.id || index}
                          secondaryAction={
                            nodeTypesEditMode && (
                              <Box>
                                <IconButton
                                  edge="end"
                                  aria-label="edit"
                                  onClick={() => handleOpenEditTypeModal('node', originalIndex)}
                                  disabled={type.is_system}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  edge="end"
                                  aria-label="delete"
                                  onClick={() => handleDeleteConfirmation('node', originalIndex)}
                                  disabled={type.is_system}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            )
                          }
                        >
                          <ListItemIcon>
                            <CategoryIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                                {type.value}
                                {type.is_system && (
                                  <Chip 
                                    label="System" 
                                    size="small" 
                                    color="primary" 
                                    sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                                  />
                                )}
                              </Box>
                            }
                            secondary={type.description || ''} 
                          />
                        </ListItem>
                      )})
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No node types configured.
                      </Typography>
                    )}
                  </List>
                  
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                      variant={nodeTypesEditMode ? "contained" : "outlined"}
                      color={nodeTypesEditMode ? "secondary" : "primary"}
                      startIcon={nodeTypesEditMode ? <CancelIcon /> : <EditIcon />}
                      onClick={toggleNodeTypesEditMode}
                    >
                      {nodeTypesEditMode ? "Exit Edit Mode" : "Edit Types"}
                    </Button>
                    
                    {nodeTypesEditMode && (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenAddTypeModal('node')}
                      >
                        Add Type
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
            
            <Box sx={{ width: { xs: '100%', md: '50%' }, p: 1.5 }}>
              <Card variant="outlined" sx={{ mb: 3 }}>
                <CardHeader 
                  title="Relationship Types"
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Configure the available relationship types for investigations. These types will be available when creating new relationships.
                  </Typography>
                  
                  <List>
                    {filteredRelationshipTypes.length > 0 ? (
                      filteredRelationshipTypes.map((type, index) => {
                        // Find the original index in the full relationshipTypes array
                        const originalIndex = relationshipTypes.findIndex(t => t.id === type.id);
                        return (
                        <ListItem
                          key={type.id || index}
                          secondaryAction={
                            relationshipTypesEditMode && (
                              <Box>
                                <IconButton
                                  edge="end"
                                  aria-label="edit"
                                  onClick={() => handleOpenEditTypeModal('relationship', originalIndex)}
                                  disabled={type.is_system}
                                >
                                  <EditIcon />
                                </IconButton>
                                <IconButton
                                  edge="end"
                                  aria-label="delete"
                                  onClick={() => handleDeleteConfirmation('relationship', originalIndex)}
                                  disabled={type.is_system}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              </Box>
                            )
                          }
                        >
                          <ListItemIcon>
                            <LinkIcon />
                          </ListItemIcon>
                          <ListItemText 
                            primary={
                              <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                                {type.value}
                                {type.is_system && (
                                  <Chip 
                                    label="System" 
                                    size="small" 
                                    color="primary" 
                                    sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                                  />
                                )}
                              </Box>
                            }
                            secondary={type.description || ''} 
                          />
                        </ListItem>
                      )})
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No relationship types configured.
                      </Typography>
                    )}
                  </List>
                  
                  <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Button
                      variant={relationshipTypesEditMode ? "contained" : "outlined"}
                      color={relationshipTypesEditMode ? "secondary" : "primary"}
                      startIcon={relationshipTypesEditMode ? <CancelIcon /> : <EditIcon />}
                      onClick={toggleRelationshipTypesEditMode}
                    >
                      {relationshipTypesEditMode ? "Exit Edit Mode" : "Edit Types"}
                    </Button>
                    
                    {relationshipTypesEditMode && (
                      <Button
                        variant="contained"
                        color="primary"
                        startIcon={<AddIcon />}
                        onClick={() => handleOpenAddTypeModal('relationship')}
                      >
                        Add Type
                      </Button>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Box>
          </Box>
        </Box>
      )}

      {activeTab === 'modules' && (
        <Box>
          <Typography variant="h5" gutterBottom>Module Management</Typography>
          
          {/* Module List Card */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader 
              title="Installed Modules"
              action={
                <Tooltip title="Reload all modules">
                  <Button
                    variant="outlined"
                    color="primary"
                    startIcon={<RefreshIcon />}
                    onClick={handleReloadAllModules}
                    disabled={loading}
                  >
                    Reload All
                  </Button>
                </Tooltip>
              }
            />
            <Divider />
            <CardContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                All available modules in the system. You can reload individual modules or all modules at once.
              </Typography>
              
              <List>
                {modules.length > 0 ? (
                  modules.map((module) => (
                    <ListItem
                      key={module.name}
                      secondaryAction={
                        <Box>
                          <Tooltip title={`Reload ${module.display_name || module.name}`}>
                            <IconButton
                              edge="end"
                              aria-label="reload"
                              onClick={() => handleReloadModule(module.name)}
                              disabled={loading}
                            >
                              <RestartAltIcon />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      }
                    >
                      <ListItemIcon>
                        <ExtensionIcon />
                      </ListItemIcon>
                      <ListItemText 
                        primary={
                          <Box component="span" sx={{ display: 'flex', alignItems: 'center' }}>
                            {module.display_name || module.name}
                            {module.has_config && (
                              <Chip 
                                label="Configurable" 
                                size="small" 
                                color="info" 
                                sx={{ ml: 1, height: 20, fontSize: '0.7rem' }} 
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Typography variant="body2" component="span">
                            {module.description} <Typography component="span" color="text.secondary" variant="caption">v{module.version}</Typography>
                          </Typography>
                        } 
                      />
                    </ListItem>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No modules available.
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
          
          {/* Module Configuration Card */}
          <Card variant="outlined" sx={{ mb: 3 }}>
            <CardHeader title="Module Configuration" />
            <Divider />
            <CardContent>
              <Typography variant="body2" color="text.secondary" paragraph>
                Configure settings for modules that support configuration options.
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
                <FormControl fullWidth variant="outlined" sx={{ flex: 1 }}>
                  <InputLabel id="module-select-label">Select a Module</InputLabel>
                  <Select
                    labelId="module-select-label"
                    id="module-select"
                    value={activeModule || ''}
                    onChange={handleModuleSelect}
                    label="Select a Module"
                    input={
                      <OutlinedInput
                        label="Select a Module"
                        endAdornment={
                          activeModule ? (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="clear module selection"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveModule('');
                                  setConfiguredModules({});
                                }}
                                edge="end"
                                size="small"
                                sx={{ 
                                  mr: 1,
                                  '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                  }
                                }}
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          ) : null
                        }
                      />
                    }
                    MenuProps={{
                      PaperProps: {
                        style: {
                          maxHeight: 300,
                        },
                      },
                    }}
                  >
                    <ListItem dense disablePadding sx={{ p: 1, position: 'sticky', top: 0, bgcolor: 'background.paper', zIndex: 1 }}>
                      <TextField
                        fullWidth
                        size="small"
                        placeholder="Search modules..."
                        value={moduleSearchTerm}
                        onChange={(e) => setModuleSearchTerm(e.target.value)}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon fontSize="small" />
                            </InputAdornment>
                          ),
                          endAdornment: moduleSearchTerm ? (
                            <InputAdornment position="end">
                              <IconButton
                                size="small"
                                onClick={() => setModuleSearchTerm('')}
                              >
                                <ClearIcon fontSize="small" />
                              </IconButton>
                            </InputAdornment>
                          ) : null
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </ListItem>
                    <Divider />
                    {modules
                      .filter(m => m.has_config)
                      .filter(m => 
                        (m.display_name || m.name).toLowerCase().includes(moduleSearchTerm.toLowerCase()) ||
                        (m.description || '').toLowerCase().includes(moduleSearchTerm.toLowerCase())
                      )
                      .map(module => (
                        <MenuItem key={module.name} value={module.name}>
                          {module.display_name || module.name}
                        </MenuItem>
                      ))
                    }
                    {modules.filter(m => m.has_config).filter(m => 
                      (m.display_name || m.name).toLowerCase().includes(moduleSearchTerm.toLowerCase()) ||
                      (m.description || '').toLowerCase().includes(moduleSearchTerm.toLowerCase())
                    ).length === 0 && (
                      <MenuItem disabled>
                        {moduleSearchTerm ? 'No matching modules' : 'No configurable modules available'}
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
                
                <Tooltip title="Reload selected module">
                  <span>
                    <Button
                      variant="outlined"
                      color="secondary"
                      startIcon={<RestartAltIcon />}
                      onClick={() => activeModule ? handleReloadModule(activeModule) : null}
                      disabled={!activeModule || loading}
                      sx={{ 
                        height: '56px',
                        minWidth: '150px',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Reload Module
                    </Button>
                  </span>
                </Tooltip>
              </Box>
              
              {activeModule && (
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {modules.find(m => m.name === activeModule)?.display_name || activeModule} Configuration
                  </Typography>
                  
                  <Formik
                    initialValues={{ 
                      config: JSON.stringify(configuredModules[activeModule] || {}, null, 2) 
                    }}
                    enableReinitialize={true}
                    validationSchema={Yup.object({
                      config: Yup.string()
                        .required('Required')
                        .test('is-valid-json', 'Invalid JSON format', (value) => {
                          try {
                            if (value) JSON.parse(value);
                            return true;
                          } catch (e) {
                            return false;
                          }
                        })
                    })}
                    onSubmit={(values) => handleSaveModuleConfig(values)}
                  >
                    {({ values, errors, touched, handleChange, handleBlur, handleSubmit, isSubmitting, setFieldValue }) => (
                      <Form onSubmit={handleSubmit}>
                        <TextField
                          name="config"
                          id="config"
                          multiline
                          fullWidth
                          minRows={10}
                          maxRows={20}
                          value={values.config}
                          onChange={handleChange}
                          onBlur={handleBlur}
                          variant="outlined"
                          error={touched.config && Boolean(errors.config)}
                          helperText={touched.config && errors.config}
                          sx={{ fontFamily: 'monospace', mb: 3 }}
                        />
                        
                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                          <Button
                            type="submit"
                            variant="contained"
                            color="primary"
                            disabled={loading || isSubmitting}
                          >
                            {loading || isSubmitting ? (
                              <CircularProgress size={24} />
                            ) : (
                              'Save Configuration'
                            )}
                          </Button>
                        </Box>
                      </Form>
                    )}
                  </Formik>
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
};

export default Settings; 
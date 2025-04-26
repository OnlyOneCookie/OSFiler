/**
 * Dashboard
 * 
 * Main landing page with investigation management
 */

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Formik, Form, Field } from 'formik';
import * as Yup from 'yup';
import {
  Box,
  Button,
  Typography,
  Container,
  Card,
  CardContent,
  TextField,
  IconButton,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  InputAdornment,
  Stack,
  Link,
  CardActions,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  Sort as SortIcon,
  Tag as TagIcon,
  Edit as EditOutlinedIcon,
  DeleteOutline as DeleteOutlineIcon,
  UnarchiveOutlined as UnarchiveOutlinedIcon,
  ArchiveOutlined as ArchiveOutlinedIcon,
  Link as LinkIcon,
  Hub as HubIcon,
} from '@mui/icons-material';
import apiService, { Investigation } from '../services/api';
import { useNotification } from '../contexts/NotificationContext';

// Validation schema for new investigation
const NewInvestigationSchema = Yup.object().shape({
  title: Yup.string()
    .required('Title is required')
    .min(3, 'Title must be at least 3 characters')
    .max(100, 'Title must be less than 100 characters'),
  description: Yup.string()
    .max(1000, 'Description must be less than 1000 characters'),
  tags: Yup.string(),
});

// New investigation form values
interface NewInvestigationFormValues {
  title: string;
  description: string;
  tags: string;
}

const initialFormValues: NewInvestigationFormValues = {
  title: '',
  description: '',
  tags: '',
};

/**
 * Dashboard page component.
 * 
 * @returns The dashboard page component.
 */
const Dashboard: React.FC = () => {
  const [investigations, setInvestigations] = useState<Investigation[]>([]);
  const [filteredInvestigations, setFilteredInvestigations] = useState<Investigation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showNewForm, setShowNewForm] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [includeArchived, setIncludeArchived] = useState<boolean>(false);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  
  // Debounce timer ref
  const searchTimeout = useRef<NodeJS.Timeout>();
  
  // Hooks
  const navigate = useNavigate();
  const { notify } = useNotification();

  // Load investigations on mount and filter changes
  useEffect(() => {
    loadInvestigations();
  }, [includeArchived]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    searchTimeout.current = setTimeout(() => {
      handleSearch();
    }, 300);

    return () => {
      if (searchTimeout.current) {
        clearTimeout(searchTimeout.current);
      }
    };
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  // Extract tags for filtering
  useEffect(() => {
    if (investigations.length > 0) {
      const tags = new Set<string>();
      investigations.forEach(inv => {
        inv.tags.forEach((tag: string) => tags.add(tag));
      });
      setAvailableTags(Array.from(tags).sort());
    }
  }, [investigations]);

  // Apply filters and sorting
  useEffect(() => {
    let filtered = [...investigations];
    
    if (selectedTags.length > 0) {
      filtered = filtered.filter(inv => 
        selectedTags.some(tag => inv.tags.includes(tag))
      );
    }
    
    filtered = sortInvestigations(filtered);
    
    setFilteredInvestigations(filtered);
  }, [investigations, selectedTags, sortOrder]); // eslint-disable-line react-hooks/exhaustive-deps

  // Toggle tag selection
  const toggleTagSelection = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag) 
        : [...prev, tag]
    );
  };

  // Clear all selected tags
  const clearTagSelection = () => {
    setSelectedTags([]);
  };

  // Sort by date
  const sortInvestigations = (investigationsToSort: Investigation[]) => {
    return [...investigationsToSort].sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? dateB - dateA : dateA - dateB;
    });
  };

  // Fetch investigations
  const loadInvestigations = async () => {
    setIsLoading(true);
    
    try {
      const data = await apiService.getInvestigations(0, 100, includeArchived);
      setInvestigations(data);
      setFilteredInvestigations(data);
    } catch (err: any) {
      console.error('Error loading investigations:', err.response?.data?.detail || 'Failed to load investigations');
      console.error('Error loading investigations:', err);
      notify(err.response?.data?.detail || 'Failed to load investigations', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Search investigations
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadInvestigations();
      return;
    }
    
    setIsLoading(true);
    
    try {
      const data = await apiService.searchInvestigations(searchQuery, 0, 100, includeArchived);
      setInvestigations(data);
      setFilteredInvestigations(data);
    } catch (err: any) {
      console.error('Search failed:', err.response?.data?.detail || 'Search failed');
      console.error('Search error:', err);
      notify(err.response?.data?.detail || 'Search failed', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Create new investigation
  const handleCreateInvestigation = async (values: NewInvestigationFormValues) => {
    try {
      // Convert tags string to array
      const tagsArray = values.tags
        ? values.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
        : [];
      
      const newInvestigation = await apiService.createInvestigation({
        title: values.title,
        description: values.description,
        tags: tagsArray,
      });
      
      setInvestigations([newInvestigation, ...investigations]);
      setShowNewForm(false);
      
      navigate(`/investigations/${newInvestigation.id}`);
      notify('Investigation created successfully', 'success');
    } catch (err: any) {
      console.error('Failed to create investigation:', err.response?.data?.detail || 'Failed to create investigation');
      console.error('Error creating investigation:', err);
      notify(err.response?.data?.detail || 'Failed to create investigation', 'error');
    }
  };

  // Archive/unarchive investigation
  const handleArchiveToggle = async (investigation: Investigation) => {
    try {
      if (investigation.is_archived) {
        await apiService.unarchiveInvestigation(investigation.id);
        notify(`Investigation "${investigation.title}" unarchived`, 'success');
      } else {
        await apiService.archiveInvestigation(investigation.id);
        notify(`Investigation "${investigation.title}" archived`, 'success');
      }
      
      // Refresh the list
      loadInvestigations();
    } catch (err: any) {
      console.error('Error updating investigation:', err.response?.data?.detail || 'Failed to update investigation');
      console.error('Error updating investigation:', err);
      notify(err.response?.data?.detail || 'Failed to update investigation', 'error');
    }
  };

  // Delete investigation
  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this investigation? This action cannot be undone.')) {
      return;
    }
    
    try {
      await apiService.deleteInvestigation(id);
      setInvestigations(investigations.filter(inv => inv.id !== id));
      notify('Investigation deleted successfully', 'success');
    } catch (err: any) {
      console.error('Error deleting investigation:', err.response?.data?.detail || 'Failed to delete investigation');
      console.error('Error deleting investigation:', err);
      notify(err.response?.data?.detail || 'Failed to delete investigation', 'error');
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Investigations
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Manage your investigations and explore data connections
        </Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 3, borderRadius: 1 }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2 }}>
          <Box sx={{ flexGrow: 1, width: { xs: '100%', md: '50%' } }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search investigations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                )
              }}
              size="small"
            />
          </Box>
          
          <Box sx={{ width: { xs: '100%', md: '50%' }, display: 'flex', justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
            <Stack direction="row" spacing={1}>
              {!showNewForm && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<AddIcon />}
                  onClick={() => setShowNewForm(true)}
                  size="small"
                >
                  New Investigation
                </Button>
              )}
              
              <Button
                variant="outlined"
                startIcon={<SortIcon />}
                onClick={() => setSortOrder(sortOrder === 'newest' ? 'oldest' : 'newest')}
                size="small"
              >
                {sortOrder === 'newest' ? 'Newest First' : 'Oldest First'}
              </Button>
              
              <Button
                variant="outlined"
                color={includeArchived ? 'primary' : 'inherit'}
                onClick={() => setIncludeArchived(!includeArchived)}
                size="small"
              >
                {includeArchived ? 'Hide Archived' : 'Show Archived'}
              </Button>
            </Stack>
          </Box>
        </Box>
        
        {availableTags.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
              <TagIcon color="action" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                Filter by tags:
              </Typography>
              <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                {selectedTags.length > 0 && (
                  <Chip
                    label="Clear All"
                    size="small"
                    color="default"
                    variant="outlined"
                    onClick={clearTagSelection}
                  />
                )}
                {availableTags.map(tag => (
                  <Chip
                    key={tag}
                    label={tag}
                    size="small"
                    color="default"
                    variant={selectedTags.includes(tag) ? 'filled' : 'outlined'}
                    onClick={() => toggleTagSelection(tag)}
                    sx={{ 
                      backgroundColor: selectedTags.includes(tag) ? 'primary.main' : 'transparent',
                      color: selectedTags.includes(tag) ? 'white' : 'inherit'
                    }}
                  />
                ))}
              </Stack>
            </Stack>
          </Box>
        )}
      </Paper>

      {showNewForm && (
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Create New Investigation
          </Typography>
          <Formik
            initialValues={initialFormValues}
            validationSchema={NewInvestigationSchema}
            onSubmit={handleCreateInvestigation}
          >
            {({ isSubmitting, touched, errors }) => (
              <Form>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Box>
                    <Field name="title">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Title"
                          variant="outlined"
                          placeholder="Investigation title"
                          required
                          error={touched.title && Boolean(errors.title)}
                          helperText={touched.title && errors.title}
                        />
                      )}
                    </Field>
                  </Box>

                  <Box>
                    <Field name="description">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Description"
                          variant="outlined"
                          placeholder="Investigation description"
                          multiline
                          rows={3}
                          error={touched.description && Boolean(errors.description)}
                          helperText={touched.description && errors.description}
                        />
                      )}
                    </Field>
                  </Box>

                  <Box>
                    <Field name="tags">
                      {({ field }: any) => (
                        <TextField
                          {...field}
                          fullWidth
                          label="Tags (comma separated)"
                          variant="outlined"
                          placeholder="e.g. personal, high-priority, social-media"
                          error={touched.tags && Boolean(errors.tags)}
                          helperText={touched.tags && errors.tags}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <TagIcon fontSize="small" color="action" />
                              </InputAdornment>
                            )
                          }}
                        />
                      )}
                    </Field>
                  </Box>

                  <Box display="flex" justifyContent="flex-end" gap={1}>
                    <Button
                      type="button"
                      variant="outlined"
                      onClick={() => setShowNewForm(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="contained"
                      color="primary"
                      disabled={isSubmitting}
                      startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
                    >
                      {isSubmitting ? 'Creating...' : 'Create Investigation'}
                    </Button>
                  </Box>
                </Box>
              </Form>
            )}
          </Formik>
        </Paper>
      )}

      {isLoading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Loading investigations...</Typography>
        </Box>
      ) : filteredInvestigations.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 1 }}>
          <Typography variant="h6" color="text.secondary" sx={{ mb: 2 }}>
            No investigations found
          </Typography>
          
          {searchQuery && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Try a different search term or
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={loadInvestigations}
              >
                View All Investigations
              </Button>
            </Box>
          )}
          
          {selectedTags.length > 0 && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                No investigations with selected tags
              </Typography>
              <Button 
                variant="outlined" 
                size="small" 
                onClick={clearTagSelection}
              >
                Clear Tag Filters
              </Button>
            </Box>
          )}
          
          {!showNewForm && !searchQuery && selectedTags.length === 0 && (
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setShowNewForm(true)}
              sx={{ mt: 2 }}
            >
              Create Your First Investigation
            </Button>
          )}
        </Paper>
      ) : (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', margin: -1 }}>
          {filteredInvestigations.map((investigation) => (
            <Box key={investigation.id} sx={{ width: { xs: '100%', sm: '50%', md: '33.33%' }, p: 1 }}>
              <Card 
                sx={{ 
                  opacity: investigation.is_archived ? 0.8 : 1,
                  bgcolor: investigation.is_archived ? 'rgba(0, 0, 0, 0.02)' : 'background.paper',
                  borderRadius: 1,
                  transition: 'all 0.2s ease',
                  '&:hover': {
                    boxShadow: 2
                  },
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%'
                }}
                variant="outlined"
              >
                <CardContent sx={{ pb: 1, flexGrow: 1 }}>
                  <Box sx={{ mb: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Typography 
                      variant="h6" 
                      component={Link} 
                      onClick={() => navigate(`/investigations/${investigation.id}`)}
                      sx={{ 
                        color: 'primary.main', 
                        cursor: 'pointer',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        fontSize: '1rem',
                        fontWeight: 'bold',
                        '&:hover': { textDecoration: 'underline' },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '80%'
                      }}
                    >
                      {investigation.title}
                    </Typography>
                    
                    {investigation.is_archived && (
                      <Chip 
                        size="small" 
                        label="Archived" 
                        sx={{ ml: 1, bgcolor: 'text.disabled', color: 'white', height: '20px', fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                
                {investigation.description && (
                    <Typography 
                      variant="body2" 
                      color="text.secondary" 
                      sx={{ 
                        mb: 2, 
                        overflow: 'hidden', 
                        textOverflow: 'ellipsis', 
                        display: '-webkit-box', 
                        WebkitLineClamp: 2, 
                        WebkitBoxOrient: 'vertical',
                        fontSize: '0.875rem',
                        lineHeight: '1.3'
                      }}
                    >
                      {investigation.description}
                    </Typography>
                  )}
                  
                  <Stack spacing={1}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip 
                        icon={<HubIcon sx={{ fontSize: '0.7rem !important' }} />} 
                        label={`${investigation.node_count || 0} nodes`}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          height: '22px', 
                          fontSize: '0.7rem',
                          '& .MuiChip-icon': { marginLeft: '5px' }
                        }}
                      />
                      <Chip 
                        icon={<LinkIcon sx={{ fontSize: '0.7rem !important' }} />} 
                        label={`${investigation.relationship_count || 0} links`}
                        size="small"
                        variant="outlined"
                        sx={{ 
                          height: '22px', 
                          fontSize: '0.7rem',
                          '& .MuiChip-icon': { marginLeft: '5px' }
                        }}
                      />
                    </Box>
                  
                  {investigation.tags.length > 0 && (
                    <Box display="flex" flexWrap="wrap" gap={0.5}>
                      {investigation.tags.map((tag: string, index: number) => (
                        <Chip
                          key={index} 
                          label={tag}
                          size="small"
                          variant="outlined"
                          onClick={() => toggleTagSelection(tag)}
                          sx={{ 
                            height: '20px', 
                            fontSize: '0.7rem', 
                            cursor: 'pointer',
                            backgroundColor: selectedTags.includes(tag) ? 'primary.main' : 'transparent',
                            color: selectedTags.includes(tag) ? 'white' : 'inherit'
                          }}
                        />
                      ))}
                    </Box>
                  )}
                    
                    <Stack spacing={0.5}>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary', display: 'inline-block', width: '70px' }}>
                          Created:
                        </Box>
                        {formatDate(investigation.created_at)}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                        <Box component="span" sx={{ fontWeight: 'medium', color: 'text.primary', display: 'inline-block', width: '70px' }}>
                          Updated:
                        </Box>
                        {formatDate(investigation.updated_at)}
                      </Typography>
                    </Stack>
                  </Stack>
                </CardContent>
                
                <Box sx={{ mt: 'auto' }}>
                  <Divider />
                  
                  <CardActions sx={{ px: 1, py: 0.5, justifyContent: 'space-between' }}>
                    <Button
                      size="small"
                      color="primary"
                      onClick={() => navigate(`/investigations/${investigation.id}`)}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      Open
                    </Button>
                    
                    <Box>
                      <IconButton
                        size="small"
                        onClick={() => navigate(`/investigations/${investigation.id}?edit=true`)}
                        sx={{ padding: 0.5 }}
                      >
                        <EditOutlinedIcon fontSize="small" />
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        onClick={() => handleArchiveToggle(investigation)}
                        sx={{ padding: 0.5 }}
                      >
                        {investigation.is_archived ? <UnarchiveOutlinedIcon fontSize="small" /> : <ArchiveOutlinedIcon fontSize="small" />}
                      </IconButton>
                      
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => handleDelete(investigation.id)}
                        sx={{ padding: 0.5 }}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  </CardActions>
                </Box>
              </Card>
            </Box>
          ))}
        </Box>
      )}
    </Container>
  );
};

export default Dashboard;
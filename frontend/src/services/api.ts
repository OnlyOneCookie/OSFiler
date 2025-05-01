/**
 * API service for OSFiler frontend.
 * 
 * This module provides functions for communicating with the backend API,
 * including authentication, investigations, nodes, relationships, and modules.
 */

import axios, { AxiosInstance, InternalAxiosRequestConfig } from 'axios';

// API base URL
const API_URL = process.env.REACT_APP_API_URL || '/api';

// Types
export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  email?: string;
  full_name?: string;
}

export interface User {
  id: string;
  username: string;
  email?: string;
  full_name?: string;
  is_admin: boolean;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  username: string;
  is_admin: boolean;
}

export interface Investigation {
  id: string;
  title: string;
  description: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  is_archived: boolean;
  tags: string[];
  node_count?: number;
  relationship_count?: number;
}

export interface Node {
  id: string;
  investigation_id: string;
  type: string;
  name: string;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  source_module?: string;
}

export interface Relationship {
  id: string;
  investigation_id: string;
  source_node_id: string;
  target_node_id: string;
  type: string;
  strength: number;
  data: Record<string, any>;
  created_at: string;
  updated_at: string;
  created_by?: string;
  source_module?: string;
}

export interface Module {
  name: string;
  display_name?: string; 
  description: string;
  version: string;
  author: string;
  required_params: Array<Record<string, any>>;
  optional_params: Array<Record<string, any>>;
  category: string;
  tags: string[];
  created_at: string;
  updated_at: string;
  enabled: boolean;
  has_config: boolean | string;
  config_schema?: Record<string, any>;
}

export interface ModuleExecuteResult {
  status: string;
  module: string;
  timestamp: string;
  data?: Record<string, any>;
  error?: string;
}

export interface GraphNodeData {
  id: string;
  label: string;
  type: string;
  [key: string]: any;
}

export interface GraphEdgeData {
  id: string;
  from: string;
  to: string;
  label?: string;
  [key: string]: any;
}

export interface GraphData {
  nodes: GraphNodeData[];
  edges: GraphEdgeData[];
}

export interface Type {
  id: string;
  value: string;
  entity_type: 'node' | 'relationship';
  description?: string;
  created_at: string;
  updated_at: string;
  is_system: boolean;
}

export interface CreateTypeData {
  value: string;
  entity_type: 'node' | 'relationship';
  description?: string;
}

export interface UpdateTypeData {
  value?: string;
  description?: string;
}

/**
 * Interface for type with description in settings
 */
export interface TypeWithDescription {
  value: string;
  description?: string;
}

/**
 * API service class.
 * 
 * This class provides methods for communicating with the backend API.
 */
class APIService {
  private axios: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.axios = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.axios.interceptors.request.use(
        (config: InternalAxiosRequestConfig) => {
        if (this.token && config.headers) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }
        return config;
        },
        (error) => {
        return Promise.reject(error);
        }
    );
    
    this.axios.interceptors.response.use(
      (response) => {
        return response;
      },
      (error) => {
        const originalRequest = error.config;
        
        // If the error is 401 Unauthorized and it wasn't a login attempt
        if (error.response?.status === 401 && 
            originalRequest.url !== '/auth/login' &&
            !originalRequest._retry) {
          console.log('Session expired - redirecting to login');
          // Clear the token
          this.clearToken();
          
          // Redirect to login page if needed
          if (typeof window !== 'undefined') {
            // Avoid redirect loops by checking the current path
            if (!window.location.pathname.includes('/login')) {
              window.location.href = '/login';
            }
          }
        }
        
        return Promise.reject(error);
      }
    );

    // Check for existing token in localStorage
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      this.setToken(storedToken);
    }
  }

  /**
   * Set the authentication token.
   * 
   * @param token - The JWT token.
   */
  public setToken(token: string): void {
    this.token = token;
    localStorage.setItem('token', token);
  }

  /**
   * Clear the authentication token.
   */
  public clearToken(): void {
    this.token = null;
    localStorage.removeItem('token');
  }

  /**
   * Check if the user is authenticated.
   * 
   * @returns True if authenticated, false otherwise.
   */
  public isAuthenticated(): boolean {
    return this.token !== null;
  }

  // Authentication methods

  /**
   * Log in a user.
   * 
   * @param credentials - The login credentials.
   * @returns The authentication response.
   */
  public async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // Convert credentials to form data for OAuth2 compatibility
    const formData = new URLSearchParams();
    formData.append('username', credentials.username);
    formData.append('password', credentials.password);

    const response = await this.axios.post<AuthResponse>('/auth/login', formData, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    // Store token
    this.setToken(response.data.access_token);

    return response.data;
  }

  /**
   * Register a new user.
   * 
   * @param userData - The user registration data.
   * @returns The created user.
   */
  public async register(userData: RegisterData): Promise<User> {
    const response = await this.axios.post<User>('/auth/register', userData);
    return response.data;
  }

  /**
   * Log out the current user.
   */
  public logout(): void {
    this.clearToken();
  }

  /**
   * Get the current user's information.
   * 
   * @returns The user information.
   */
  public async getCurrentUser(): Promise<User> {
    const response = await this.axios.get<User>('/auth/me');
    return response.data;
  }

  /**
   * Change the current user's password.
   * 
   * @param oldPassword - The current password.
   * @param newPassword - The new password.
   * @returns Success message.
   */
  public async changePassword(oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.axios.post<{ message: string }>('/auth/change-password', {
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  }

  // Investigation methods

  /**
   * Create a new investigation.
   * 
   * @param investigation - The investigation data.
   * @returns The created investigation.
   */
  public async createInvestigation(investigation: {
    title: string;
    description?: string;
    tags?: string[];
  }): Promise<Investigation> {
    const response = await this.axios.post<Investigation>('/investigations', investigation);
    return response.data;
  }

  /**
   * Get all investigations for the current user.
   * 
   * @param skip - Number of investigations to skip.
   * @param limit - Maximum number of investigations to return.
   * @param includeArchived - Whether to include archived investigations.
   * @returns List of investigations.
   */
  public async getInvestigations(
    skip = 0,
    limit = 100,
    includeArchived = false
  ): Promise<Investigation[]> {
    const response = await this.axios.get<Investigation[]>('/investigations', {
      params: {
        skip,
        limit,
        include_archived: includeArchived,
      },
    });
    return response.data;
  }

  /**
   * Get an investigation by ID.
   * 
   * @param id - The investigation ID.
   * @returns The investigation.
   */
  public async getInvestigation(id: string): Promise<Investigation> {
    const response = await this.axios.get<Investigation>(`/investigations/${id}`);
    return response.data;
  }

  /**
   * Update an investigation.
   * 
   * @param id - The investigation ID.
   * @param data - The data to update.
   * @returns The updated investigation.
   */
  public async updateInvestigation(
    id: string,
    data: {
      title?: string;
      description?: string;
      tags?: string[];
      is_archived?: boolean;
    }
  ): Promise<Investigation> {
    const response = await this.axios.put<Investigation>(`/investigations/${id}`, data);
    return response.data;
  }

  /**
   * Delete an investigation.
   * 
   * @param id - The investigation ID.
   * @returns Success message.
   */
  public async deleteInvestigation(id: string): Promise<{ message: string }> {
    const response = await this.axios.delete<{ message: string }>(`/investigations/${id}`);
    return response.data;
  }

  /**
   * Archive an investigation.
   * 
   * @param id - The investigation ID.
   * @returns Success message.
   */
  public async archiveInvestigation(id: string): Promise<{ message: string }> {
    const response = await this.axios.post<{ message: string }>(`/investigations/${id}/archive`);
    return response.data;
  }

  /**
   * Unarchive an investigation.
   * 
   * @param id - The investigation ID.
   * @returns Success message.
   */
  public async unarchiveInvestigation(id: string): Promise<{ message: string }> {
    const response = await this.axios.post<{ message: string }>(`/investigations/${id}/unarchive`);
    return response.data;
  }

  /**
   * Search for investigations by title or description.
   * 
   * @param query - The search query.
   * @param skip - Number of investigations to skip.
   * @param limit - Maximum number of investigations to return.
   * @param includeArchived - Whether to include archived investigations.
   * @returns List of matching investigations.
   */
  public async searchInvestigations(
    query: string,
    skip = 0,
    limit = 100,
    includeArchived = false
  ): Promise<Investigation[]> {
    const response = await this.axios.get<Investigation[]>('/investigations/search', {
      params: {
        query,
        skip,
        limit,
        include_archived: includeArchived,
      },
    });
    return response.data;
  }

  /**
   * Export an investigation.
   * 
   * @param id - The investigation ID.
   * @returns The exported investigation data.
   */
  public async exportInvestigation(id: string): Promise<Record<string, any>> {
    const response = await this.axios.get<Record<string, any>>(`/investigations/${id}/export`);
    return response.data;
  }

  /**
   * Import an investigation.
   * 
   * @param data - The investigation data to import.
   * @returns The imported investigation.
   */
  public async importInvestigation(data: Record<string, any>): Promise<Investigation & { messages: string[] }> {
    const response = await this.axios.post<Investigation & { messages: string[] }>('/investigations/import', data);
    return response.data;
  }

  // Node methods

  /**
   * Create a new node.
   * 
   * @param node - The node data.
   * @returns The created node.
   */
  public async createNode(node: {
    investigation_id: string;
    type: string;
    name: string;
    data?: Record<string, any>;
  }): Promise<Node> {
    const response = await this.axios.post<Node>('/nodes', node);
    return response.data;
  }

  /**
   * Get a node by ID.
   * 
   * @param id - The node ID.
   * @returns The node.
   */
  public async getNode(id: string): Promise<Node> {
    const response = await this.axios.get<Node>(`/nodes/${id}`);
    return response.data;
  }

  /**
   * Update a node.
   * 
   * @param id - The node ID.
   * @param data - The data to update.
   * @returns The updated node.
   */
  public async updateNode(
    id: string,
    data: {
      name?: string;
      type?: string;
      data?: Record<string, any>;
    }
  ): Promise<Node> {
    const response = await this.axios.put<Node>(`/nodes/${id}`, data);
    return response.data;
  }

  /**
   * Delete a node.
   * 
   * @param id - The node ID.
   * @returns Success message.
   */
  public async deleteNode(id: string): Promise<{ message: string }> {
    const response = await this.axios.delete<{ message: string }>(`/nodes/${id}`);
    return response.data;
  }

  /**
   * Get all nodes for an investigation.
   * 
   * @param investigationId - The investigation ID.
   * @param typeFilter - Filter nodes by type.
   * @param skip - Number of nodes to skip.
   * @param limit - Maximum number of nodes to return.
   * @returns List of nodes.
   */
  public async getNodesForInvestigation(
    investigationId: string,
    typeFilter?: string,
    skip = 0,
    limit = 100
  ): Promise<Node[]> {
    const response = await this.axios.get<Node[]>('/nodes', {
      params: {
        investigation_id: investigationId,
        type_filter: typeFilter,
        skip,
        limit,
      },
    });
    return response.data;
  }

  /**
   * Get the number of nodes for an investigation.
   * 
   * @param investigationId - The investigation ID.
   * @param typeFilter - Filter nodes by type.
   * @returns The node count.
   */
  public async getNodeCount(investigationId: string, typeFilter?: string): Promise<number> {
    const response = await this.axios.get<{ count: number }>(`/nodes/count/${investigationId}`, {
      params: {
        type_filter: typeFilter,
      },
    });
    return response.data.count;
  }

  /**
   * Search for nodes in an investigation.
   * 
   * @param investigationId - The investigation ID.
   * @param query - The search query.
   * @param typeFilter - Filter nodes by type.
   * @param skip - Number of nodes to skip.
   * @param limit - Maximum number of nodes to return.
   * @returns List of matching nodes.
   */
  public async searchNodes(
    investigationId: string,
    query: string,
    typeFilter?: string,
    skip = 0,
    limit = 100
  ): Promise<Node[]> {
    const response = await this.axios.get<Node[]>(`/nodes/search/${investigationId}`, {
      params: {
        query,
        type_filter: typeFilter,
        skip,
        limit,
      },
    });
    return response.data;
  }

  /**
   * Get nodes related to a specific node.
   * 
   * @param nodeId - The node ID.
   * @param relationshipType - Filter by relationship type.
   * @param direction - Relationship direction (outgoing, incoming, or both).
   * @returns List of related nodes.
   */
  public async getRelatedNodes(
    nodeId: string,
    relationshipType?: string,
    direction = 'both'
  ): Promise<Node[]> {
    const response = await this.axios.get<Node[]>(`/nodes/related/${nodeId}`, {
      params: {
        relationship_type: relationshipType,
        direction,
      },
    });
    return response.data;
  }

  /**
   * Get node types for a specific investigation.
   * 
   * @param investigationId The investigation ID
   * @returns Dictionary mapping node types to counts.
   */
  public async getNodeTypes(investigationId?: string): Promise<Type[] | Record<string, number>> {
    // If investigationId is provided, get investigation-specific node types
    if (investigationId) {
      const response = await this.axios.get<Record<string, number>>(`/nodes/types/${investigationId}`);
      return response.data;
    }
    
    // Otherwise get all node types from the database
    const response = await this.axios.get<Type[]>('/types/node');
    return response.data;
  }

  /**
   * Create a node if it doesn't exist, or update it if it does.
   * 
   * @param node - The node data.
   * @returns The created or updated node.
   */
  public async createOrUpdateNode(node: {
    investigation_id: string;
    type: string;
    name: string;
    data?: Record<string, any>;
  }): Promise<Node> {
    const response = await this.axios.post<Node>('/nodes/create-or-update', node);
    return response.data;
  }

  /**
   * Get graph data for visualization.
   * 
   * @param investigationId - The investigation ID.
   * @returns Graph data with nodes and edges.
   */
  public async getGraphData(investigationId: string): Promise<GraphData> {
    const response = await this.axios.get<GraphData>(`/nodes/graph/${investigationId}`);
    return response.data;
  }

  // Relationship methods

  /**
   * Create a new relationship between nodes.
   * 
   * @param relationship - The relationship data.
   * @returns The created relationship.
   */
  public async createRelationship(relationship: {
    investigation_id: string;
    source_node_id: string;
    target_node_id: string;
    type: string;
    strength?: number;
    data?: Record<string, any>;
  }): Promise<Relationship> {
    const response = await this.axios.post<Relationship>('/relationships', relationship);
    return response.data;
  }

  /**
   * Get a relationship by ID.
   * 
   * @param id - The relationship ID.
   * @returns The relationship.
   */
  public async getRelationship(id: string): Promise<Relationship> {
    const response = await this.axios.get<Relationship>(`/relationships/${id}`);
    return response.data;
  }

  /**
   * Update a relationship.
   * 
   * @param id - The relationship ID.
   * @param data - The data to update.
   * @returns The updated relationship.
   */
  public async updateRelationship(
    id: string,
    data: {
      type?: string;
      strength?: number;
      data?: Record<string, any>;
    }
  ): Promise<Relationship> {
    const response = await this.axios.put<Relationship>(`/relationships/${id}`, data);
    return response.data;
  }

  /**
   * Delete a relationship by ID.
   * 
   * @param id - The relationship ID
   * @returns Promise that resolves when the deletion is complete
   */
  public async deleteRelationship(id: string): Promise<void> {
    console.log(`Attempting to delete relationship with ID: ${id}`);
    
    try {
      await this.axios.delete(`/relationships/${id}`);
      console.log(`Successfully deleted relationship with ID: ${id}`);
    } catch (error: any) {
      console.error(`Direct delete failed for relationship ${id}:`, error.response?.status);
      
      // Try to find the relationship in all investigation relationships
      try {
        // Get all current user's investigations
        const investigations = await this.getInvestigations();
        
        // Attempt to find the relationship in any investigation
        for (const investigation of investigations) {
          console.log(`Searching for relationship in investigation: ${investigation.id}`);
          const relationships = await this.getRelationshipsForInvestigation(investigation.id);
          
          // Check if any relationship data contains this ID
          for (const relationship of relationships) {
            const relationshipStr = JSON.stringify(relationship);
            if (relationshipStr.includes(id)) {
              console.log(`Found relationship ${relationship.id} containing target ID in investigation ${investigation.id}`);
              
              // Delete using the actual ID from the server
              await this.axios.delete(`/relationships/${relationship.id}`);
              console.log(`Successfully deleted relationship using ID: ${relationship.id}`);
              return;
            }
          }
        }
        
        // If we still haven't found it, check if the ID is a source_target compound ID
        if (id.includes('_')) {
          const [sourceId, targetId] = id.split('_');
          console.log(`Attempting fallback with source ${sourceId} and target ${targetId}`);
          
          try {
            const relationships = await this.getRelationshipsBetweenNodes(sourceId, targetId);
            if (relationships.length > 0) {
              const relationship = relationships[0];
              console.log(`Found relationship between nodes, deleting with ID: ${relationship.id}`);
              await this.axios.delete(`/relationships/${relationship.id}`);
              console.log(`Successfully deleted relationship between ${sourceId} and ${targetId}`);
              return;
            }
          } catch (fallbackError) {
            console.error('Failed to find relationship between nodes:', fallbackError);
          }
        }
        
        console.error('Cannot find the target relationship to delete');
        throw new Error('Relationship not found in any investigation');
      } catch (searchError) {
        console.error('Error searching for relationship:', searchError);
      }
      
      throw error;
    }
  }

  /**
   * Get all relationships for an investigation.
   * 
   * @param investigationId - The investigation ID.
   * @param typeFilter - Filter relationships by type.
   * @param skip - Number of relationships to skip.
   * @param limit - Maximum number of relationships to return.
   * @returns List of relationships.
   */
  public async getRelationshipsForInvestigation(
    investigationId: string,
    typeFilter?: string,
    skip = 0,
    limit = 100
  ): Promise<Relationship[]> {
    const response = await this.axios.get<Relationship[]>('/relationships', {
      params: {
        investigation_id: investigationId,
        type_filter: typeFilter,
        skip,
        limit,
      },
    });
    return response.data;
  }

  /**
   * Get the number of relationships for an investigation.
   * 
   * @param investigationId - The investigation ID.
   * @param typeFilter - Filter relationships by type.
   * @returns The relationship count.
   */
  public async getRelationshipCount(investigationId: string, typeFilter?: string): Promise<number> {
    const response = await this.axios.get<{ count: number }>(`/relationships/count/${investigationId}`, {
      params: {
        type_filter: typeFilter,
      },
    });
    return response.data.count;
  }

  /**
   * Get relationships between two nodes.
   * 
   * @param sourceId - The source node ID
   * @param targetId - The target node ID
   * @returns Array of relationships between the specified nodes
   */
  public async getRelationshipsBetweenNodes(sourceId: string, targetId: string): Promise<Relationship[]> {
    const response = await this.axios.get<Relationship[]>(`/relationships/between`, {
      params: {
        source_id: sourceId,
        target_id: targetId
      }
    });
    return response.data;
  }

  /**
   * Check if a relationship exists between two nodes.
   * 
   * @param sourceId - The source node ID.
   * @param targetId - The target node ID.
   * @param relationshipType - The relationship type to check for.
   * @returns Whether the relationship exists.
   */
  public async checkRelationshipExists(
    sourceId: string,
    targetId: string,
    relationshipType?: string
  ): Promise<boolean> {
    const response = await this.axios.post<{ exists: boolean }>('/relationships/check-exists', {
      source_id: sourceId,
      target_id: targetId,
      relationship_type: relationshipType,
    });
    return response.data.exists;
  }

  /**
   * Create a relationship if it doesn't exist, or update it if it does.
   * 
   * @param relationship - The relationship data.
   * @returns The created or updated relationship.
   */
  public async createOrUpdateRelationship(relationship: {
    investigation_id: string;
    source_node_id: string;
    target_node_id: string;
    type: string;
    strength?: number;
    data?: Record<string, any>;
  }): Promise<Relationship> {
    const response = await this.axios.post<Relationship>('/relationships/create-or-update', relationship);
    return response.data;
  }

  /**
   * Get relationship types for a specific investigation.
   * 
   * @param investigationId The investigation ID
   * @returns Dictionary mapping relationship types to counts or array of Type objects.
   */
  public async getRelationshipTypes(investigationId?: string): Promise<Type[] | Record<string, number>> {
    // If investigationId is provided, get investigation-specific relationship types
    if (investigationId) {
      const response = await this.axios.get<Record<string, number>>(`/relationships/types/${investigationId}`);
      return response.data;
    }
    
    // Otherwise get all relationship types from the database
    const response = await this.axios.get<Type[]>('/types/relationship');
    return response.data;
  }

  // Module methods

  /**
   * Get all available modules.
   * 
   * @returns List of module information.
   */
  public async getModules(): Promise<Module[]> {
    const response = await this.axios.get<Module[]>('/modules');
    return response.data;
  }

  /**
   * Get information about a specific module.
   * 
   * @param moduleName - The name of the module.
   * @returns Module information.
   */
  public async getModule(moduleName: string): Promise<Module> {
    const response = await this.axios.get<Module>(`/modules/${moduleName}`);
    return response.data;
  }

  /**
   * Execute a module with parameters.
   * 
   * @param moduleName - The name of the module to execute.
   * @param params - Parameters for module execution.
   * @returns The result of the module execution.
   */
  public async executeModule(moduleName: string, params: Record<string, any>): Promise<ModuleExecuteResult> {
    // Check if any value in params is a File
    const hasFile = Object.values(params).some(v => v instanceof File);
    if (hasFile) {
      const formData = new FormData();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formData.append(key, value);
        }
      });
      const response = await this.axios.post<ModuleExecuteResult>(`/modules/${moduleName}/execute`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } else {
      const response = await this.axios.post<ModuleExecuteResult>(`/modules/${moduleName}/execute`, params);
      return response.data;
    }
  }

  /**
   * Execute a specific action on a module with parameters.
   * 
   * @param moduleName - The name of the module.
   * @param action - The action to execute.
   * @param params - Additional parameters for the action.
   * @returns The result of the module action.
   */
  public async executeModuleAction(
    moduleName: string, 
    action: string, 
    params: Record<string, any> = {}
  ): Promise<any> {
    const actionParams = {
      ...params,
      action
    };
    const response = await this.axios.post<any>(`/modules/${moduleName}/execute`, actionParams);
    return response.data;
  }

  /**
   * Get the parameters required and optional for a module.
   * 
   * @param moduleName - The name of the module.
   * @returns The required and optional parameters.
   */
  public async getModuleParams(moduleName: string): Promise<{
    required_params: Array<Record<string, any>>;
    optional_params: Array<Record<string, any>>;
  }> {
    const response = await this.axios.get<{
      required_params: Array<Record<string, any>>;
      optional_params: Array<Record<string, any>>;
    }>(`/modules/${moduleName}/params`);
    return response.data;
  }

  // System methods

  /**
   * Get health check information.
   * 
   * @returns Application health information.
   */
  public async getHealth(): Promise<{
    status: string;
    version: string;
    environment: string;
  }> {
    const response = await this.axios.get<{
      status: string;
      version: string;
      environment: string;
    }>('/health');
    return response.data;
  }

  /**
   * Get public application settings.
   * 
   * @returns Public application settings.
   */
  public async getSettings(): Promise<{
    app_name: string;
    app_version: string;
    environment: string;
    node_types: string[];
    relationship_types: string[];
  }> {
    const response = await this.axios.get<{
      app_name: string;
      app_version: string;
      environment: string;
      node_types: string[];
      relationship_types: string[];
    }>('/settings');
    return response.data;
  }

  /**
   * Check if two nodes are connected in either direction, regardless of relationship type.
   * 
   * @param nodeId1 - First node ID.
   * @param nodeId2 - Second node ID.
   * @returns Whether the nodes are connected in any way.
   */
  public async areNodesConnected(nodeId1: string, nodeId2: string): Promise<boolean> {
    try {
      // Check both directions
      const forwardCheck = await this.checkRelationshipExists(nodeId1, nodeId2);
      if (forwardCheck) return true;
      
      const reverseCheck = await this.checkRelationshipExists(nodeId2, nodeId1);
      return reverseCheck;
    } catch (error) {
      console.error("Error checking if nodes are connected:", error);
      return false;
    }
  }

  /**
   * Generic request method for custom API calls.
   * 
   * @param method The HTTP method to use
   * @param url The URL to request
   * @param data The data to send
   * @returns The response data
   */
  public async request<T = any>(method: string, url: string, data: any): Promise<{
    status: number;
    data: T;
  }> {
    try {
      const response = await this.axios.request({
        method,
        url,
        data: method.toLowerCase() !== 'get' ? data : undefined,
        params: method.toLowerCase() === 'get' ? data : undefined,
      });
      
      return {
        status: response.status,
        data: response.data
      };
    } catch (error: any) {
      if (error.response) {
        // Server responded with an error status
        throw new Error(error.response.data.detail || 'Server error');
      } else if (error.request) {
        // Request was made but no response
        throw new Error('No response from server');
      } else {
        // Request setup error
        throw new Error('Request failed');
      }
    }
  }

  /**
   * Get a module's configuration.
   * 
   * @param moduleName The name of the module
   * @returns The module configuration, schema, and status
   */
  public async getModuleConfig(moduleName: string): Promise<{
    status: string;
    message: string;
    has_config: boolean;
    config: Record<string, any>;
    config_schema: Record<string, any>;
  }> {
    const response = await this.axios.get(`/modules/${moduleName}/config`);
    return response.data;
  }

  /**
   * Update a module's configuration.
   * 
   * @param moduleName The name of the module
   * @param config The updated configuration
   * @returns Status and updated configuration
   */
  public async updateModuleConfig(moduleName: string, config: Record<string, any>): Promise<{
    status: string;
    message: string;
    config: Record<string, any>;
  }> {
    try {
      const response = await this.axios.post(`/modules/${moduleName}/config`, config);
      return response.data;
    } catch (error) {
      console.error('Error updating module configuration:', error);
      throw error;
    }
  }

  /**
   * Reload a specific module.
   * 
   * @param moduleName - The name of the module to reload.
   * @returns The response from the server.
   */
  public async reloadModule(moduleName: string): Promise<{
    message: string;
  }> {
    try {
      const response = await this.axios.post(`/modules/${moduleName}/reload`);
      return response.data;
    } catch (error) {
      console.error(`Error reloading module ${moduleName}:`, error);
      throw error;
    }
  }

  /**
   * Reload all modules.
   * 
   * @returns The response from the server.
   */
  public async reloadAllModules(): Promise<{
    message: string;
  }> {
    try {
      const response = await this.axios.post('/modules/reload-all');
      return response.data;
    } catch (error) {
      console.error('Error reloading all modules:', error);
      throw error;
    }
  }

  /**
   * Get a module's configuration schema.
   * 
   * @param moduleName The name of the module
   * @returns The module's configuration schema
   */
  public async getModuleConfigSchema(moduleName: string): Promise<{
    status: string;
    has_config: boolean;
    config_schema: Record<string, any>;
  }> {
    const response = await this.axios.get(`/modules/${moduleName}/config_schema`);
    return response.data;
  }

  /**
   * Add a node from a module to an investigation
   * 
   * @param moduleName The name of the module
   * @param nodeData The node data to add
   * @returns The created node
   */
  public async addModuleNode(
    moduleName: string,
    nodeData: {
      type: string;
      name: string;
      investigation_id: string;
      data?: Record<string, any>;
    }
  ): Promise<{
    status: string;
    node: Node;
  }> {
    const response = await this.axios.post(`/modules/${moduleName}/add_node`, nodeData);
    return response.data;
  }

  /**
   * Get global node types from database
   * 
   * @returns List of node types
   */
  public async getGlobalNodeTypes(): Promise<Type[]> {
    return this.getNodeTypes() as Promise<Type[]>;
  }

  /**
   * Get global relationship types from database
   * 
   * @returns List of relationship types
   */
  public async getGlobalRelationshipTypes(): Promise<Type[]> {
    return this.getRelationshipTypes() as Promise<Type[]>;
  }

  /**
   * Update global node types in database
   * 
   * @param nodeTypes Updated list of node types or objects with value and description
   * @returns Result of the update operation
   */
  public async updateNodeTypes(nodeTypes: string[] | TypeWithDescription[]): Promise<Record<string, any>> {
    try {
      // First get all existing node types to compare
      const existingTypes = await this.getTypes('node');
      const existingTypeMap = new Map(existingTypes.map(type => [type.value, type]));
      
      // Convert input to TypeWithDescription array
      const typesWithDesc: TypeWithDescription[] = nodeTypes.map(type => {
        if (typeof type === 'string') {
          return { value: type };
        } else {
          return type;
        }
      });
      
      // Find types that need to be deleted (exist in DB but not in the new list)
      const typesToDelete = existingTypes.filter(
        type => !type.is_system && !typesWithDesc.some(t => t.value === type.value)
      );
      
      // Delete unused types
      for (const typeToDelete of typesToDelete) {
        await this.deleteType(typeToDelete.id);
      }
      
      // Create or update types
      const results = [];
      for (const type of typesWithDesc) {
        const existingType = existingTypeMap.get(type.value);
        
        if (existingType) {
          // Update existing type if description changed
          if (existingType.description !== type.description) {
            const result = await this.updateType(existingType.id, {
              description: type.description
            });
            results.push(result);
          } else {
            results.push(existingType);
          }
        } else {
          // Create new type
          const result = await this.createType({
            value: type.value,
            entity_type: 'node',
            description: type.description
          });
          results.push(result);
        }
      }
      
      return { 
        success: true, 
        message: 'Node types updated',
        created: results.filter(Boolean).length,
        deleted: typesToDelete.length
      };
    } catch (error) {
      console.error("Error updating node types:", error);
      throw error;
    }
  }

  /**
   * Update global relationship types in database
   * 
   * @param relationshipTypes Updated list of relationship types or objects with value and description
   * @returns Result of the update operation
   */
  public async updateRelationshipTypes(relationshipTypes: string[] | TypeWithDescription[]): Promise<Record<string, any>> {
    try {
      // First get all existing relationship types to compare
      const existingTypes = await this.getTypes('relationship');
      const existingTypeMap = new Map(existingTypes.map(type => [type.value, type]));
      
      // Convert input to TypeWithDescription array
      const typesWithDesc: TypeWithDescription[] = relationshipTypes.map(type => {
        if (typeof type === 'string') {
          return { value: type };
        } else {
          return type;
        }
      });
      
      // Find types that need to be deleted (exist in DB but not in the new list)
      const typesToDelete = existingTypes.filter(
        type => !type.is_system && !typesWithDesc.some(t => t.value === type.value)
      );
      
      // Delete unused types
      for (const typeToDelete of typesToDelete) {
        await this.deleteType(typeToDelete.id);
      }
      
      // Create or update types
      const results = [];
      for (const type of typesWithDesc) {
        const existingType = existingTypeMap.get(type.value);
        
        if (existingType) {
          // Update existing type if description changed
          if (existingType.description !== type.description) {
            const result = await this.updateType(existingType.id, {
              description: type.description
            });
            results.push(result);
          } else {
            results.push(existingType);
          }
        } else {
          // Create new type
          const result = await this.createType({
            value: type.value,
            entity_type: 'relationship',
            description: type.description
          });
          results.push(result);
        }
      }
      
      return { 
        success: true, 
        message: 'Relationship types updated',
        created: results.filter(Boolean).length,
        deleted: typesToDelete.length
      };
    } catch (error) {
      console.error("Error updating relationship types:", error);
      throw error;
    }
  }

  /**
   * Get all types, optionally filtered by entity type.
   * 
   * @param entityType - Optional filter for entity type ('node' or 'relationship')
   * @returns The list of types.
   */
  public async getTypes(entityType?: 'node' | 'relationship'): Promise<Type[]> {
    const params: Record<string, any> = {};
    if (entityType) {
      params.entity_type = entityType;
    }

    const response = await this.axios.get<Type[]>('/types', { params });
    return response.data;
  }

  /**
   * Get a type by ID.
   * 
   * @param id - The type ID.
   * @returns The type.
   */
  public async getType(id: string): Promise<Type> {
    const response = await this.axios.get<Type>(`/types/${id}`);
    return response.data;
  }

  /**
   * Create a new type.
   * 
   * @param data - The type data.
   * @returns The created type.
   */
  public async createType(data: CreateTypeData): Promise<Type> {
    const response = await this.axios.post<Type>('/types', data);
    return response.data;
  }

  /**
   * Update a type.
   * 
   * @param id - The type ID.
   * @param data - The type data to update.
   * @returns The updated type.
   */
  public async updateType(id: string, data: UpdateTypeData): Promise<Type> {
    const response = await this.axios.put<Type>(`/types/${id}`, data);
    return response.data;
  }

  /**
   * Delete a type.
   * 
   * @param id - The type ID.
   * @returns A success message.
   */
  public async deleteType(id: string): Promise<{ message: string }> {
    const response = await this.axios.delete<{ message: string }>(`/types/${id}`);
    return response.data;
  }
}

// Create and export API service instance
const apiService = new APIService();
export default apiService;
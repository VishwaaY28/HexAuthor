/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import toast from 'react-hot-toast';
import { API } from '../utils/constants';

export type Workspace = {
  id: string;
  name: string;
  clientName?: string;
  tags: string[];
  workspaceType?: string;
  createdAt?: string;
};

export type ContentChunk = {
  id: string;
  text: string;
  tag: string;
  createdAt: string;
};

export function useWorkspace() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(false);

  async function fetchWorkspaces() {
    setLoading(true);
    try {
      const res = await fetch(API.BASE_URL() + API.ENDPOINTS.WORKSPACES.BASE_URL(), {
        headers: {
          Authorization: localStorage.getItem('token')
            ? `Bearer ${localStorage.getItem('token')}`
            : '',
        },
      });
      if (!res.ok) throw new Error('Failed to fetch workspaces');
      const data = await res.json();
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Could not load workspaces');
    } finally {
      setLoading(false);
    }
  }

  async function filterWorkspaces(nameQuery?: string, tags?: string[]) {
    setLoading(true);
    try {
      const res = await fetch(
        API.BASE_URL() + API.ENDPOINTS.WORKSPACES.BASE_URL() + API.ENDPOINTS.WORKSPACES.FILTER(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
          body: JSON.stringify({
            name_query: nameQuery,
            tags: tags,
          }),
        },
      );
      if (!res.ok) throw new Error('Failed to filter workspaces');
      const data = await res.json();
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Could not filter workspaces');
    } finally {
      setLoading(false);
    }
  }

  async function searchWorkspaces(nameQuery?: string, tags?: string[]) {
    setLoading(true);
    try {
      const res = await fetch(
        API.BASE_URL() + API.ENDPOINTS.WORKSPACES.BASE_URL() + API.ENDPOINTS.WORKSPACES.SEARCH(),
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
          body: JSON.stringify({
            name_query: nameQuery,
            tags: tags,
          }),
        },
      );
      if (!res.ok) throw new Error('Failed to search workspaces');
      const data = await res.json();
      setWorkspaces(Array.isArray(data) ? data : []);
    } catch (err: any) {
      toast.error(err.message || 'Could not search workspaces');
    } finally {
      setLoading(false);
    }
  }

  async function fetchWorkspace(id: string) {
    setLoading(true);
    try {
      const res = await fetch(
        API.BASE_URL() + API.ENDPOINTS.WORKSPACES.BASE_URL() + API.ENDPOINTS.WORKSPACES.BY_ID(id),
        {
          headers: {
            Authorization: localStorage.getItem('token')
              ? `Bearer ${localStorage.getItem('token')}`
              : '',
          },
        },
      );
      if (!res.ok) throw new Error('Failed to fetch workspace');
      const data = await res.json();
      return {
        ...data,
        clientName: data.client,
        workspaceType: data.workspace_type,
      };
    } catch (err: any) {
      toast.error(err.message || 'Could not load workspace');
    } finally {
      setLoading(false);
    }
  }

  async function filterWorkspacesByTags(tags: string[]) {
    return await filterWorkspaces(undefined, tags);
  }

  function getAllTags() {
    const tags = new Set<string>();
    workspaces.forEach((w) => w.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }

  async function createWorkspace(data: { name: string; client: string; tags: string[]; workspace_type?: string }) {
    const payload: any = {
      name: data.name,
      client: data.client,
      tags: data.tags,
    };
    if (data.workspace_type) payload.workspace_type = data.workspace_type;
    const res = await fetch(API.BASE_URL() + API.ENDPOINTS.WORKSPACES.BASE_URL(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: localStorage.getItem('token')
          ? `Bearer ${localStorage.getItem('token')}`
          : '',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Failed to create workspace' }));
      if (err.detail?.includes('already exists')) {
        throw new Error('A workspace with this name already exists. Please choose a different name.');
      }
      throw new Error(err.detail || 'Failed to create workspace');
    }
    const ws = await res.json();
    const newWorkspace: Workspace = {
      id: ws.id.toString(),
      name: ws.name,
      clientName: ws.client,
      tags: data.tags,
      createdAt: new Date().toISOString().split('T')[0],
    };
    setWorkspaces((prev) => [...prev, newWorkspace]);
    return newWorkspace;
  }

  function updateWorkspace(id: string, data: Partial<Workspace>) {
    setWorkspaces((prev) =>
      prev.map((workspace) => (workspace.id === id ? { ...workspace, ...data } : workspace)),
    );
  }

  async function deleteWorkspace(id: string, hard = false) {
    setLoading(true);
    try {
      const endpoint = hard 
        ? API.ENDPOINTS.WORKSPACES.DELETE_HARD(id)
        : API.ENDPOINTS.WORKSPACES.DELETE_SOFT(id);
      
      const res = await fetch(API.BASE_URL() + API.ENDPOINTS.WORKSPACES.BASE_URL() + endpoint, {
        method: 'DELETE',
        headers: {
          Authorization: localStorage.getItem('token')
            ? `Bearer ${localStorage.getItem('token')}`
            : '',
        },
      });
      
      if (!res.ok) throw new Error(`Failed to ${hard ? 'hard' : 'soft'} delete workspace`);
      
      // Remove the workspace from local state
      setWorkspaces((prev) => prev.filter((workspace) => workspace.id !== id));
      return true;
    } catch (err: any) {
      toast.error(err.message || `Could not delete workspace`);
      return false;
    } finally {
      setLoading(false);
    }
  }

  return {
    workspaces,
    loading,
    fetchWorkspaces,
    searchWorkspaces,
    fetchWorkspace,
    filterWorkspaces,
    filterWorkspacesByTags,
    getAllTags,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
  };
}

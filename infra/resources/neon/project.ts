import {
  type BranchResponse,
  type ConnectionURIsOptionalResponse,
  createApiClient,
  type DatabasesResponse,
  type EndpointsResponse,
  type OperationsResponse,
  type ProjectCreateRequest,
  type ProjectResponse,
  type RolesResponse,
} from '@neondatabase/api-client';
import { type Context, Resource } from 'alchemy';
import { AxiosError } from 'axios';

export interface NeonProjectProps extends ProjectCreateRequest {
  adopt?: boolean;
}

export interface NeonProject
  extends Resource<'neon::Project'>,
    Omit<NeonProjectProps, 'project' | 'endpoints'>,
    ProjectResponse,
    BranchResponse,
    EndpointsResponse,
    OperationsResponse,
    RolesResponse,
    DatabasesResponse,
    ConnectionURIsOptionalResponse {}

export const NeonProject = Resource(
  'neon::Project',
  async function (
    this: Context<NeonProject>,
    _id: string,
    props: NeonProjectProps,
  ): Promise<NeonProject> {
    if (!process.env.NEON_API_KEY) {
      throw new Error('NEON_API_KEY is not set');
    }
    const apiClient = createApiClient({ apiKey: process.env.NEON_API_KEY });

    if (this.phase === 'delete') {
      try {
        await apiClient.deleteProject(this.output.project.id);
        return this.destroy();
      } catch (e) {
        throw new Error('Failed to delete project project', { cause: e });
      }
    } else if (this.phase === 'update') {
      try {
        const { data } = await apiClient.updateProject(this.output.project.id, {
          project: {
            name: props.project.name,
            settings: props.project.settings,
            default_endpoint_settings: props.project.default_endpoint_settings,
            history_retention_seconds: props.project.history_retention_seconds,
          },
        });
        return this({
          ...this.output,
          project: data.project,
          operations: data.operations,
        });
      } catch (error) {
        throw new Error('Failed to update project project', { cause: error });
      }
    } else {
      try {
        const { data } = await apiClient.createProject({
          project: props.project,
        });
        return this(data);
      } catch (e) {
        if (e instanceof AxiosError) {
          if (e.response?.status === 409 && props.adopt) {
            const { data } = await apiClient.listProjects({
              search: props.project?.name,
            });
            if (!data.projects[0]) {
              throw new Error('Project not found');
            }
            const projectId = data.projects[0].id;

            const [
              {
                data: { project },
              },
              {
                data: { branches },
              },
              {
                data: { endpoints },
              },
              {
                data: { operations },
              },
            ] = await Promise.all([
              apiClient.getProject(projectId),
              apiClient.listProjectBranches({ projectId }),
              apiClient.listProjectEndpoints(projectId),
              apiClient.listProjectOperations({ projectId }),
            ]);
            if (!branches[0]) {
              throw new Error('Project branch not found');
            }

            const [
              {
                data: { roles },
              },
              {
                data: { databases },
              },
            ] = await Promise.all([
              apiClient.listProjectBranchRoles(projectId, branches[0].id),
              apiClient.listProjectBranchDatabases(projectId, branches[0].id),
            ]);

            return this({
              project,
              endpoints,
              operations,
              branch: branches[0],
              roles,
              databases,
            });
          }
        }
        throw new Error('Failed to create project project', { cause: e });
      }
    }
  },
);

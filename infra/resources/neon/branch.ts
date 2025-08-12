import {
  type AnnotationCreateValueRequest,
  type BranchCreateRequest,
  type BranchResponse,
  type ConnectionURIsOptionalResponse,
  createApiClient,
  type DatabasesResponse,
  type EndpointsResponse,
  type OperationsResponse,
  type RolesResponse,
} from '@neondatabase/api-client';
import { type Context, Resource } from 'alchemy';
import { AxiosError } from 'axios';

export interface NeonBranchProps extends BranchCreateRequest, AnnotationCreateValueRequest {
  projectId: string;
  adopt?: boolean;
}

export interface NeonBranch
  extends Resource<'neon::Branch'>,
    Omit<NeonBranchProps, 'branch' | 'endpoints'>,
    BranchResponse,
    EndpointsResponse,
    OperationsResponse,
    RolesResponse,
    DatabasesResponse,
    ConnectionURIsOptionalResponse {}

export const NeonBranch = Resource(
  'neon::Branch',
  async function (
    this: Context<NeonBranch>,
    _id: string,
    props: NeonBranchProps,
  ): Promise<NeonBranch> {
    if (!process.env.NEON_API_KEY) {
      throw new Error('NEON_API_KEY is not set');
    }
    const apiClient = createApiClient({ apiKey: process.env.NEON_API_KEY });

    if (this.phase === 'delete') {
      try {
        await apiClient.deleteProjectBranch(this.output.projectId, this.output.branch.id);
        return this.destroy();
      } catch (e) {
        throw new Error('Failed to delete project branch', { cause: e });
      }
    } else if (this.phase === 'update') {
      if (props.projectId !== this.output.projectId) {
        this.replace();
      } else {
        try {
          const { data } = await apiClient.updateProjectBranch(
            props.projectId,
            this.output.branch.id,
            {
              branch: {
                name: props.branch?.name,
                expires_at: props.branch?.expires_at,
                protected: props.branch?.protected,
              },
            },
          );
          return this({
            ...this.output,
            branch: data.branch,
            operations: data.operations,
          });
        } catch (error) {
          throw new Error('Failed to update project branch', { cause: error });
        }
      }
    } else {
      try {
        const { data } = await apiClient.createProjectBranch(props.projectId, {
          branch: props.branch,
          endpoints: props.endpoints,
          annotation_value: props.annotation_value,
        });
        return this({
          projectId: data.branch.project_id,
          ...data,
        });
      } catch (e) {
        if (e instanceof AxiosError) {
          if (e.response?.status === 409 && props.adopt) {
            const { data } = await apiClient.listProjectBranches({
              projectId: props.projectId,
              search: props.branch?.name,
            });
            if (!data.branches[0]) {
              throw new Error('Branch not found');
            }
            const branchId = data.branches[0].id;

            const [
              {
                data: { branch },
              },
              {
                data: { endpoints },
              },
              {
                data: { operations },
              },
              {
                data: { roles },
              },
              {
                data: { databases },
              },
            ] = await Promise.all([
              apiClient.getProjectBranch(props.projectId, branchId),
              apiClient.listProjectBranchEndpoints(props.projectId, branchId),
              apiClient.listProjectOperations({ projectId: props.projectId }),
              apiClient.listProjectBranchRoles(props.projectId, branchId),
              apiClient.listProjectBranchDatabases(props.projectId, branchId),
            ]);

            return this({
              projectId: props.projectId,
              branch,
              endpoints,
              operations,
              roles,
              databases,
            });
          }
        }
        throw new Error('Failed to create project branch', { cause: e });
      }
    }
  },
);

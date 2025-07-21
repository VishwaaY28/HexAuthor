from database.models import Workspace, Tag, WorkspaceTag
from tortoise.exceptions import DoesNotExist, IntegrityError
from tortoise.transactions import in_transaction

class WorkspaceRepository:
    @staticmethod
    async def create_workspace(name: str, client: str, tag_names: list[str], workspace_type: str = None):
        async with in_transaction():
            # Check for case-insensitive uniqueness
            existing_workspace = await Workspace.filter(name__iexact=name, deleted_at=None).first()
            if existing_workspace:
                raise ValueError(f"Workspace with name '{name}' already exists")
            
            workspace = await Workspace.create(name=name, client=client, workspace_type=workspace_type)

            for tag_name in tag_names:
                if tag_name.strip():
                    tag, _ = await Tag.get_or_create(name=tag_name.strip())
                    await WorkspaceTag.create(workspace=workspace, tag=tag)

            return workspace

    @staticmethod
    async def fetch_all_workspaces():
        return await Workspace.filter(deleted_at=None).prefetch_related("tags__tag").all()

    @staticmethod
    async def fetch_by_id(workspace_id: int):
        try:
            return await Workspace.get(id=workspace_id, deleted_at=None).prefetch_related("tags__tag")
        except DoesNotExist:
            return None

    @staticmethod
    async def fetch_by_name(name: str):
        try:
            return await Workspace.get(name=name, deleted_at=None).prefetch_related("tags__tag")
        except DoesNotExist:
            return None

    @staticmethod
    async def filter_workspaces(name_query: str = None, tag_names: list[str] = None):
        query = Workspace.filter(deleted_at=None)

        if name_query:
            query = query.filter(name__icontains=name_query)

        if tag_names:
            query = query.filter(tags__tag__name__in=tag_names).distinct()

        return await query.prefetch_related("tags__tag")

    @staticmethod
    async def search_workspaces(name_query: str = None, tag_names: list[str] = None):
        return await WorkspaceRepository.filter_workspaces(name_query, tag_names)

    @staticmethod
    async def filter_by_tags(tag_names: list[str]):
        return await Workspace.filter(
            tags__tag__name__in=tag_names,
            deleted_at=None
        ).distinct().prefetch_related("tags__tag")

    @staticmethod
    async def update_workspace(workspace_id: int, **kwargs):
        workspace = await Workspace.get_or_none(id=workspace_id, deleted_at=None)
        if not workspace:
            return None
        allowed_fields = {"name", "client"}
        for key, value in kwargs.items():
            if key in allowed_fields:
                setattr(workspace, key, value)
        await workspace.save()
        return workspace

    @staticmethod
    async def update_workspace_tags(workspace_id: int, tag_names: list[str]):
        async with in_transaction():
            workspace = await Workspace.get_or_none(id=workspace_id, deleted_at=None)
            if not workspace:
                raise ValueError("Workspace not found")

            await WorkspaceTag.filter(workspace=workspace).delete()

            for tag_name in tag_names:
                if tag_name.strip():
                    tag, _ = await Tag.get_or_create(name=tag_name.strip())
                    await WorkspaceTag.create(workspace=workspace, tag=tag)

            return workspace

    @staticmethod
    async def update_last_used(workspace_id: int):
        workspace = await Workspace.get_or_none(id=workspace_id, deleted_at=None)
        if workspace:
            from datetime import datetime
            workspace.last_used_at = datetime.utcnow()
            await workspace.save()
        return workspace

    @staticmethod
    async def soft_delete(workspace_id: int):
        workspace = await Workspace.get_or_none(id=workspace_id)
        if not workspace:
            return False
        from datetime import datetime
        workspace.deleted_at = datetime.utcnow()
        await workspace.save()
        return True

    @staticmethod
    async def hard_delete(workspace_id: int):
        async with in_transaction():
            await WorkspaceTag.filter(workspace_id=workspace_id).delete()
            deleted_count = await Workspace.filter(id=workspace_id).delete()
            return deleted_count > 0

workspace_repository = WorkspaceRepository()

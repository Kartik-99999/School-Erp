from typing import Any, Generic, List, Optional, Type, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

ModelType = TypeVar("ModelType")
CreateSchemaType = TypeVar("CreateSchemaType")
UpdateSchemaType = TypeVar("UpdateSchemaType")


class CRUDBase(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    def __init__(self, model: Type[ModelType]):
        """
        CRUD object with default methods to Create, Read, Update, Delete (CRUD).
        """
        self.model = model

    async def get(
        self, db: AsyncSession, id: Any, school_id: Optional[str] = None
    ) -> Optional[ModelType]:
        query = select(self.model).filter(self.model.id == id)
        if school_id:
            query = query.filter(self.model.school_id == school_id)
        result = await db.execute(query)
        return result.scalars().first()

    async def get_multi(
        self, db: AsyncSession, *, skip: int = 0, limit: int = 100, school_id: Optional[str] = None
    ) -> List[ModelType]:
        query = select(self.model).offset(skip).limit(limit)
        if school_id:
            query = query.filter(self.model.school_id == school_id)
        result = await db.execute(query)
        return result.scalars().all()

    async def create(
        self, db: AsyncSession, *, obj_in: CreateSchemaType, school_id: Optional[str] = None
    ) -> ModelType:
        obj_in_data = obj_in.dict()
        if school_id:
            obj_in_data["school_id"] = school_id
        db_obj = self.model(**obj_in_data)  # type: ignore
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def update(
        self, db: AsyncSession, *, db_obj: ModelType, obj_in: UpdateSchemaType
    ) -> ModelType:
        obj_data = db_obj.__dict__
        update_data = obj_in.dict(exclude_unset=True)
        for field in obj_data:
            if field in update_data:
                setattr(db_obj, field, update_data[field])
        db.add(db_obj)
        await db.commit()
        await db.refresh(db_obj)
        return db_obj

    async def remove(
        self, db: AsyncSession, *, id: Any, school_id: Optional[str] = None
    ) -> ModelType:
        query = select(self.model).filter(self.model.id == id)
        if school_id:
            query = query.filter(self.model.school_id == school_id)
        result = await db.execute(query)
        obj = result.scalars().first()
        if obj:
            await db.delete(obj)
            await db.commit()
        return obj

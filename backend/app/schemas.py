import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.models import BookStatus, ContactCategory, DayType, MealType, TransactionType, VocabularyType

# ---------- Journal ----------


class JournalEntryBase(BaseModel):
    title: str | None = None
    content: str
    entry_date: datetime.date
    tag: str | None = None
    mood: str | None = None
    private: bool = False


class JournalEntryCreate(JournalEntryBase):
    pass


class JournalEntryUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    entry_date: datetime.date | None = None
    tag: str | None = None
    mood: str | None = None
    private: bool | None = None


class JournalEntryOut(JournalEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime.datetime
    updated_at: datetime.datetime


# ---------- Vocabulaire ----------


class VocabularyEntryBase(BaseModel):
    type: VocabularyType = VocabularyType.MOT
    term: str
    language: str = "Français"
    nature: str | None = None
    author: str | None = None
    definition: str
    source: str | None = None
    example: str | None = None
    mastery: int = 20
    reviewed_today: bool = False


class VocabularyEntryCreate(VocabularyEntryBase):
    pass


class VocabularyEntryUpdate(BaseModel):
    type: VocabularyType | None = None
    term: str | None = None
    language: str | None = None
    nature: str | None = None
    author: str | None = None
    definition: str | None = None
    source: str | None = None
    example: str | None = None
    mastery: int | None = None
    reviewed_today: bool | None = None


class VocabularyEntryOut(VocabularyEntryBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime.datetime


# ---------- Repertoire ----------


class FamilyMemberBase(BaseModel):
    name: str
    relation_to_contact: str


class FamilyMemberCreate(FamilyMemberBase):
    pass


class FamilyMemberOut(FamilyMemberBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class ContactBase(BaseModel):
    first_name: str
    last_name: str | None = None
    category: ContactCategory = ContactCategory.CONNAISSANCE
    birth_day: int | None = None
    birth_month: int | None = None
    birth_year: int | None = None
    met_where: str | None = None
    notes: str | None = None


class ContactCreate(ContactBase):
    family_members: list[FamilyMemberCreate] = []


class ContactUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    category: ContactCategory | None = None
    birth_day: int | None = None
    birth_month: int | None = None
    birth_year: int | None = None
    met_where: str | None = None
    notes: str | None = None
    family_members: list[FamilyMemberCreate] | None = None


class ContactOut(ContactBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    photo_path: str | None = None
    created_at: datetime.datetime
    contact_day: int | None = None
    contact_month: int | None = None
    last_contacted_at: datetime.datetime | None = None
    family_members: list[FamilyMemberOut] = []


# ---------- 168 Heures ----------


class ActivityBase(BaseModel):
    name: str
    icon: str | None = None
    color: str = "#3b82f6"


class ActivityCreate(ActivityBase):
    pass


class ActivityUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None


class ActivityOut(ActivityBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class HourCellSet(BaseModel):
    day_of_week: int
    hour: int
    activity_id: int


class HourCellOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_of_week: int
    hour: int
    activity_id: int


# ---------- Blueprint ----------


class BlueprintItemBase(BaseModel):
    day_type: DayType = DayType.TRAVAIL
    start_minute: int
    end_minute: int
    icon: str | None = None
    title: str
    subtitle: str | None = None


class BlueprintItemCreate(BlueprintItemBase):
    pass


class BlueprintItemUpdate(BaseModel):
    day_type: DayType | None = None
    start_minute: int | None = None
    end_minute: int | None = None
    icon: str | None = None
    title: str | None = None
    subtitle: str | None = None


class BlueprintItemOut(BlueprintItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class HabitBase(BaseModel):
    label: str
    done: bool = False
    color: str = "#3b82f6"
    position: int = 0


class HabitCreate(HabitBase):
    pass


class HabitUpdate(BaseModel):
    label: str | None = None
    done: bool | None = None
    color: str | None = None
    position: int | None = None


class HabitOut(HabitBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class PrincipleBase(BaseModel):
    text: str
    position: int = 0


class PrincipleCreate(PrincipleBase):
    pass


class PrincipleOut(PrincipleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


# ---------- Objectifs ----------


class KeyResultBase(BaseModel):
    label: str
    done: bool = False
    position: int = 0


class KeyResultCreate(KeyResultBase):
    pass


class KeyResultUpdate(BaseModel):
    label: str | None = None
    done: bool | None = None
    position: int | None = None


class KeyResultOut(KeyResultBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class GoalBase(BaseModel):
    domain: str
    color: str = "#3b82f6"
    title: str
    year: int
    progress_percent: int = 0


class GoalCreate(GoalBase):
    key_results: list[KeyResultCreate] = []


class GoalUpdate(BaseModel):
    domain: str | None = None
    color: str | None = None
    title: str | None = None
    year: int | None = None
    progress_percent: int | None = None
    key_results: list[KeyResultCreate] | None = None


class GoalOut(GoalBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime.datetime
    key_results: list[KeyResultOut] = []


# ---------- Finances ----------


class TransactionBase(BaseModel):
    date: datetime.date
    type: TransactionType
    amount: float
    category: str | None = None
    note: str | None = None


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    date: datetime.date | None = None
    type: TransactionType | None = None
    amount: float | None = None
    category: str | None = None
    note: str | None = None


class TransactionOut(TransactionBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime.datetime


class FinancialGoalBase(BaseModel):
    title: str
    target_amount: float
    current_amount: float = 0
    color: str = "#3b82f6"


class FinancialGoalCreate(FinancialGoalBase):
    pass


class FinancialGoalUpdate(BaseModel):
    title: str | None = None
    target_amount: float | None = None
    current_amount: float | None = None
    color: str | None = None


class FinancialGoalOut(FinancialGoalBase):
    model_config = ConfigDict(from_attributes=True)


# ---------- To-Do ----------


class TaskBase(BaseModel):
    title: str
    due_date: datetime.date | None = None


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    title: str | None = None
    due_date: datetime.date | None = None
    done: bool | None = None


class TaskOut(TaskBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    done: bool
    created_at: datetime.datetime
    completed_at: datetime.datetime | None = None


# ---------- Lecture ----------


class BookBase(BaseModel):
    title: str
    author: str | None = None
    status: BookStatus = BookStatus.A_LIRE
    rating: int | None = None
    started_at: datetime.date | None = None
    finished_at: datetime.date | None = None
    notes: str | None = None


class BookCreate(BookBase):
    pass


class BookUpdate(BaseModel):
    title: str | None = None
    author: str | None = None
    status: BookStatus | None = None
    rating: int | None = None
    started_at: datetime.date | None = None
    finished_at: datetime.date | None = None
    notes: str | None = None


class BookOut(BookBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime.datetime


# ---------- Nourriture ----------


class FoodItemBase(BaseModel):
    name: str
    icon: str | None = None
    color: str = "#3b82f6"


class FoodItemCreate(FoodItemBase):
    pass


class FoodItemUpdate(BaseModel):
    name: str | None = None
    icon: str | None = None
    color: str | None = None


class FoodItemOut(FoodItemBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class MealSlotSet(BaseModel):
    day_of_week: int
    meal_type: MealType
    food_item_id: int


class MealSlotOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    day_of_week: int
    meal_type: MealType
    food_item_id: int


# ---------- Agenda ----------

TIME_PATTERN = r"^([01]\d|2[0-3]):[0-5]\d$"


class EventBase(BaseModel):
    title: str
    date: datetime.date
    start_time: str | None = Field(default=None, pattern=TIME_PATTERN)
    end_time: str | None = Field(default=None, pattern=TIME_PATTERN)
    notes: str | None = None
    color: str = "#5c7f9c"


class EventCreate(EventBase):
    pass


class EventUpdate(BaseModel):
    title: str | None = None
    date: datetime.date | None = None
    start_time: str | None = Field(default=None, pattern=TIME_PATTERN)
    end_time: str | None = Field(default=None, pattern=TIME_PATTERN)
    notes: str | None = None
    color: str | None = None


class EventOut(EventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime.datetime


# ---------- Ma semaine ----------


class RuleBase(BaseModel):
    title: str
    kind: Literal["interdit", "limite", "creneau", "a_faire"] = "a_faire"
    icon: str | None = None
    start_time: str | None = Field(default=None, pattern=TIME_PATTERN)
    end_time: str | None = Field(default=None, pattern=TIME_PATTERN)
    time_label: str | None = None
    note: str | None = None


class RuleCreate(RuleBase):
    weekdays: list[int] = []


class RuleUpdate(BaseModel):
    title: str | None = None
    kind: Literal["interdit", "limite", "creneau", "a_faire"] | None = None
    icon: str | None = None
    start_time: str | None = Field(default=None, pattern=TIME_PATTERN)
    end_time: str | None = Field(default=None, pattern=TIME_PATTERN)
    time_label: str | None = None
    note: str | None = None
    weekdays: list[int] | None = None


class RuleOut(RuleBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    position: int
    weekdays: list[int]


class RuleOverrideSet(BaseModel):
    rule_id: int
    date: datetime.date
    action: Literal["add", "remove"]


class RuleOverrideOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule_id: int
    date: datetime.date
    action: str


class RuleCheckSet(BaseModel):
    rule_id: int
    date: datetime.date
    done: bool


class RuleCheckOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    rule_id: int
    date: datetime.date


# ---------- Secteurs de vie ----------

MAX_FOCUS_PER_SECTOR = 3


class SectorItemCreate(BaseModel):
    title: str
    kind: Literal["task", "project"] = "task"
    done: bool = False
    focus: bool = False
    active: bool = False


class SectorItemUpdate(BaseModel):
    title: str | None = None
    done: bool | None = None
    focus: bool | None = None
    active: bool | None = None
    sector_id: int | None = None


class SectorItemOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    sector_id: int
    title: str
    kind: str
    done: bool
    focus: bool
    active: bool
    position: int


class SectorCreate(BaseModel):
    name: str
    description: str | None = None
    color: str = "#5c7f9c"


class SectorUpdate(BaseModel):
    name: str | None = None
    description: str | None = None
    color: str | None = None


class SectorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    description: str | None = None
    color: str
    position: int
    items: list[SectorItemOut] = []


class SectorBulkSector(SectorCreate):
    items: list[SectorItemCreate] = []


class SectorBulk(BaseModel):
    sectors: list[SectorBulkSector]


class InboxCreate(BaseModel):
    title: str


class InboxOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    created_at: datetime.datetime


class InboxMove(BaseModel):
    sector_id: int
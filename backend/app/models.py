import datetime
import enum

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def utcnow() -> datetime.datetime:
    return datetime.datetime.utcnow()


# ---------- Journal ----------


class JournalEntry(Base):
    __tablename__ = "journal_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    entry_date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    tag: Mapped[str | None] = mapped_column(String(50), nullable=True)
    mood: Mapped[str | None] = mapped_column(String(20), nullable=True)
    private: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utcnow)
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime, default=utcnow, onupdate=utcnow
    )


# ---------- Vocabulaire / Expressions ----------


class VocabularyType(str, enum.Enum):
    MOT = "mot"
    EXPRESSION = "expression"


class VocabularyEntry(Base):
    __tablename__ = "vocabulary_entries"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    type: Mapped[VocabularyType] = mapped_column(
        Enum(VocabularyType), nullable=False, default=VocabularyType.MOT
    )
    term: Mapped[str] = mapped_column(String(255), nullable=False)
    language: Mapped[str] = mapped_column(String(100), nullable=False, default="Français")
    nature: Mapped[str | None] = mapped_column(String(50), nullable=True)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    definition: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str | None] = mapped_column(String(500), nullable=True)
    example: Mapped[str | None] = mapped_column(Text, nullable=True)
    mastery: Mapped[int] = mapped_column(Integer, nullable=False, default=20)
    reviewed_today: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utcnow)


# ---------- Repertoire (contacts) ----------


class ContactCategory(str, enum.Enum):
    AMI_PROCHE = "ami_proche"
    FAMILLE = "famille"
    COLLEGUE = "collegue"
    COUSIN = "cousin"
    CONNAISSANCE = "connaissance"
    AUTRE = "autre"


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    first_name: Mapped[str] = mapped_column(String(255), nullable=False)
    last_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    category: Mapped[ContactCategory] = mapped_column(
        Enum(ContactCategory), nullable=False, default=ContactCategory.CONNAISSANCE
    )
    photo_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    birth_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    birth_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    birth_year: Mapped[int | None] = mapped_column(Integer, nullable=True)
    met_where: Mapped[str | None] = mapped_column(String(500), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utcnow)
    contact_day: Mapped[int | None] = mapped_column(Integer, nullable=True)
    contact_month: Mapped[int | None] = mapped_column(Integer, nullable=True)
    last_contacted_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)

    family_members: Mapped[list["FamilyMember"]] = relationship(
        back_populates="contact", cascade="all, delete-orphan"
    )


class FamilyMember(Base):
    __tablename__ = "family_members"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    contact_id: Mapped[int] = mapped_column(
        ForeignKey("contacts.id", ondelete="CASCADE"), nullable=False
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    relation_to_contact: Mapped[str] = mapped_column(String(255), nullable=False)

    contact: Mapped["Contact"] = relationship(back_populates="family_members")


# ---------- 168 Heures ----------


class Activity(Base):
    __tablename__ = "activities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    icon: Mapped[str | None] = mapped_column(String(10), nullable=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#3b82f6")

    hour_cells: Mapped[list["HourCell"]] = relationship(back_populates="activity")


class HourCell(Base):
    __tablename__ = "hour_cells"
    __table_args__ = (UniqueConstraint("day_of_week", "hour", name="uq_day_hour"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=lundi ... 6=dimanche
    hour: Mapped[int] = mapped_column(Integer, nullable=False)  # 0-23
    activity_id: Mapped[int] = mapped_column(
        ForeignKey("activities.id", ondelete="CASCADE"), nullable=False
    )

    activity: Mapped["Activity"] = relationship(back_populates="hour_cells")


# ---------- Blueprint (journée type) ----------


class DayType(str, enum.Enum):
    TRAVAIL = "travail"
    WEEKEND = "weekend"


class BlueprintItem(Base):
    __tablename__ = "blueprint_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    day_type: Mapped[DayType] = mapped_column(Enum(DayType), nullable=False, default=DayType.TRAVAIL)
    start_minute: Mapped[int] = mapped_column(Integer, nullable=False)
    end_minute: Mapped[int] = mapped_column(Integer, nullable=False)
    icon: Mapped[str | None] = mapped_column(String(10), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    subtitle: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Habit(Base):
    __tablename__ = "habits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    label: Mapped[str] = mapped_column(String(255), nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#3b82f6")
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


class Principle(Base):
    __tablename__ = "principles"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)


# ---------- Objectifs ----------


class Goal(Base):
    __tablename__ = "goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    domain: Mapped[str] = mapped_column(String(100), nullable=False)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#3b82f6")
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    year: Mapped[int] = mapped_column(Integer, nullable=False)
    progress_percent: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utcnow)

    key_results: Mapped[list["KeyResult"]] = relationship(
        back_populates="goal", cascade="all, delete-orphan", order_by="KeyResult.position"
    )


class KeyResult(Base):
    __tablename__ = "key_results"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    goal_id: Mapped[int] = mapped_column(
        ForeignKey("goals.id", ondelete="CASCADE"), nullable=False
    )
    label: Mapped[str] = mapped_column(String(500), nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    position: Mapped[int] = mapped_column(Integer, nullable=False, default=0)

    goal: Mapped["Goal"] = relationship(back_populates="key_results")


# ---------- Finances ----------


class TransactionType(str, enum.Enum):
    REVENU = "revenu"
    DEPENSE = "depense"
    EPARGNE = "epargne"


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[datetime.date] = mapped_column(Date, nullable=False)
    type: Mapped[TransactionType] = mapped_column(Enum(TransactionType), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    note: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utcnow)


class FinancialGoal(Base):
    __tablename__ = "financial_goals"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    target_amount: Mapped[float] = mapped_column(Float, nullable=False)
    current_amount: Mapped[float] = mapped_column(Float, nullable=False, default=0)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#3b82f6")


# ---------- To-Do ----------


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    done: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    due_date: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utcnow)
    completed_at: Mapped[datetime.datetime | None] = mapped_column(DateTime, nullable=True)


# ---------- Lecture ----------


class BookStatus(str, enum.Enum):
    A_LIRE = "a_lire"
    EN_COURS = "en_cours"
    LU = "lu"


class Book(Base):
    __tablename__ = "books"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[BookStatus] = mapped_column(
        Enum(BookStatus), nullable=False, default=BookStatus.A_LIRE
    )
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)
    started_at: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    finished_at: Mapped[datetime.date | None] = mapped_column(Date, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime, default=utcnow)


# ---------- Nourriture ----------


class MealType(str, enum.Enum):
    PETIT_DEJ = "petit_dej"
    DEJEUNER = "dejeuner"


class FoodItem(Base):
    __tablename__ = "food_items"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, unique=True)
    icon: Mapped[str | None] = mapped_column(String(10), nullable=True)
    color: Mapped[str] = mapped_column(String(20), nullable=False, default="#3b82f6")

    meal_slots: Mapped[list["MealSlot"]] = relationship(back_populates="food_item")


class MealSlot(Base):
    __tablename__ = "meal_slots"
    __table_args__ = (UniqueConstraint("day_of_week", "meal_type", name="uq_day_meal"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    day_of_week: Mapped[int] = mapped_column(Integer, nullable=False)  # 0=lundi ... 6=dimanche
    meal_type: Mapped[MealType] = mapped_column(Enum(MealType), nullable=False)
    food_item_id: Mapped[int] = mapped_column(
        ForeignKey("food_items.id", ondelete="CASCADE"), nullable=False
    )

    food_item: Mapped["FoodItem"] = relationship(back_populates="meal_slots")

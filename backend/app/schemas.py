"""Public contracts. Decimal amounts are serialized as strings, never binary floats."""

from datetime import date
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

Money = Annotated[
    Decimal,
    Field(
        ge=0,
        le=Decimal(1000000000000),
        max_digits=15,
        decimal_places=2,
        allow_inf_nan=False,
    ),
]
PositiveMoney = Annotated[
    Decimal,
    Field(
        gt=0,
        le=Decimal(1000000000000),
        max_digits=15,
        decimal_places=2,
        allow_inf_nan=False,
    ),
]
Currency = Literal["INR", "USD", "EUR", "GBP"]
Kind = Literal[
    "advance",
    "milestone",
    "final",
    "retention",
    "expense",
    "other_inflow",
    "other_outflow",
]


class Model(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)

    @field_validator("*", mode="after", check_fields=False)
    @classmethod
    def reasonable_date(cls, value):
        if isinstance(value, date) and not 2000 <= value.year <= 2100:
            raise ValueError("Use calendar dates between 2000 and 2100.")
        return value


class Source(Model):
    document: str = Field(max_length=200)
    page: int | None = Field(default=None, ge=1)
    quote: str = Field(max_length=2000)
    status: Literal["extracted_unconfirmed", "user_confirmed", "user_corrected"] = (
        "extracted_unconfirmed"
    )


class Event(Model):
    id: str = Field(min_length=1, max_length=80)
    label: str = Field(min_length=1, max_length=200)
    date: date
    amount: Money
    kind: Kind
    currency: Currency | None = None
    source: Source | None = None


class Deal(Model):
    name: str = Field(min_length=1, max_length=200)
    currency: Currency = "INR"
    opening_cash: Money
    opening_date: date
    contract_value: PositiveMoney
    reserve: Money
    events: list[Event] = Field(min_length=1, max_length=200)
    confirmed: bool = False
    notes: str = Field(default="", max_length=4000)
    term_evidence: list[Source] = Field(default_factory=list, max_length=100)

    @model_validator(mode="after")
    def check_schedule(self):
        if len({e.id for e in self.events}) != len(self.events):
            raise ValueError("Cash event identifiers must be unique.")
        payments = [
            e for e in self.events if e.kind in {"advance", "milestone", "final", "retention"}
        ]
        if not payments or sum((e.amount for e in payments), Decimal(0)) != self.contract_value:
            raise ValueError("Contract payments must add up exactly to the contract value.")
        for event in self.events:
            if event.date < self.opening_date:
                raise ValueError(f"{event.label}: date must be on or after the opening date.")
            if (event.date - self.opening_date).days > 3660:
                raise ValueError("Use a planning horizon of at most ten years.")
            if event.currency and event.currency != self.currency:
                raise ValueError(
                    "All events must use the deal currency. Currency conversion is not supported."
                )
        return self


class Scenario(Model):
    name: str = Field(default="Custom scenario", min_length=1, max_length=100)
    delay_days: int = Field(default=0, ge=0, le=365)
    expense_increase_pct: Decimal = Field(default=Decimal(0), ge=0, le=200, allow_inf_nan=False)
    advance_reduction_pct: Decimal = Field(default=Decimal(0), ge=0, le=100, allow_inf_nan=False)
    milestone_delay_days: int = Field(default=0, ge=0, le=365)
    expense_earlier_days: int = Field(default=0, ge=0, le=365)


class AnalysisRequest(Model):
    deal: Deal
    scenarios: list[Scenario] = Field(default_factory=list, max_length=8)


class SolverOptions(Model):
    max_advance_pct: int = Field(default=60, ge=0, le=100)
    step_pct: int = Field(default=1, ge=1, le=20)
    advance_date: date
    milestone_pct: int = Field(default=0, ge=0, le=100)
    milestone_date: date | None = None
    final_date: date | None = None
    protect_scenario: Scenario | None = None

    @model_validator(mode="after")
    def check_milestone(self):
        if self.milestone_pct and not self.milestone_date:
            raise ValueError("Choose a date for the optional added milestone.")
        return self


class SolveRequest(Model):
    deal: Deal
    options: SolverOptions


class TextRequest(Model):
    text: str = Field(min_length=1, max_length=60000)
    name: str = Field(default="Pasted terms", min_length=1, max_length=200)


class ReportRequest(AnalysisRequest):
    options: SolverOptions | None = None

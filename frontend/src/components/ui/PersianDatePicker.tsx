"use client";

import DatePicker, { DateObject } from "react-multi-date-picker";
import persian from "react-date-object/calendars/persian";
import persian_fa from "react-date-object/locales/persian_fa";
import gregorian from "react-date-object/calendars/gregorian";
import gregorian_en from "react-date-object/locales/gregorian_en";

interface Props {
  value?: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  inputClass?: string;
  disabled?: boolean;
}

// Accepts/returns Gregorian ISO strings (YYYY-MM-DD) but displays Jalali.
export function PersianDatePicker({ value, onChange, placeholder, inputClass, disabled }: Props) {
  const dateObj = value
    ? new DateObject({ date: value, calendar: gregorian, locale: gregorian_en }).convert(
        persian,
        persian_fa
      )
    : undefined;

  return (
    <DatePicker
      value={dateObj ?? ""}
      onChange={(d) => {
        if (!d || Array.isArray(d)) { onChange(""); return; }
        onChange((d as DateObject).convert(gregorian, gregorian_en).format("YYYY-MM-DD"));
      }}
      calendar={persian}
      locale={persian_fa}
      placeholder={placeholder ?? "انتخاب تاریخ"}
      inputClass={inputClass}
      containerClassName="w-full"
      calendarPosition="bottom-right"
      disabled={disabled}
    />
  );
}

import { describe, it, expect } from "vitest";
import {
  parseCSV,
  parseNutrition,
  parseExercises,
  parseBiometrics,
} from "../../src/cronometer/parse.js";

describe("parseCSV", () => {
  it("should parse simple CSV", () => {
    const csv = "a,b,c\n1,2,3";
    expect(parseCSV(csv)).toEqual([
      ["a", "b", "c"],
      ["1", "2", "3"],
    ]);
  });

  it("should handle quoted fields", () => {
    const csv = 'a,"b,c",d\n1,"hello ""world""",3';
    expect(parseCSV(csv)).toEqual([
      ["a", "b,c", "d"],
      ["1", 'hello "world"', "3"],
    ]);
  });

  it("should handle empty fields", () => {
    const csv = "a,,c\n1,,3";
    expect(parseCSV(csv)).toEqual([
      ["a", "", "c"],
      ["1", "", "3"],
    ]);
  });
});

describe("parseNutrition", () => {
  const sampleCSV = `Date,Energy (kcal),Protein (g),Carbs (g),Fat (g)
2026-02-11,1847,168,142,58
2026-02-10,2103,155,200,72`;

  it("should parse nutrition entries", () => {
    const entries = parseNutrition(sampleCSV);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({
      date: "2026-02-11",
      calories: 1847,
      protein: 168,
      carbs: 142,
      fat: 58,
    });
    expect(entries[1]).toMatchObject({
      date: "2026-02-10",
      calories: 2103,
      protein: 155,
      carbs: 200,
      fat: 72,
    });
  });

  it("should return empty array for empty CSV", () => {
    expect(parseNutrition("")).toEqual([]);
    expect(parseNutrition("Date,Energy (kcal)")).toEqual([]);
  });

  it("should handle missing values as 0", () => {
    const csv = `Date,Energy (kcal),Protein (g),Carbs (g),Fat (g)
2026-02-11,,,,`;
    const entries = parseNutrition(csv);
    expect(entries[0]).toMatchObject({
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    });
  });
});

describe("parseExercises", () => {
  const sampleCSV = `Day,Time,Exercise,Minutes,Calories Burned,Group
2026-02-11,07:30 AM,Running,30,350,Cardiovascular
2026-02-11,06:00 PM,Weight Training,45,200,Strength`;

  it("should parse exercise entries", () => {
    const entries = parseExercises(sampleCSV);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      date: "2026-02-11",
      time: "07:30 AM",
      exercise: "Running",
      minutes: 30,
      caloriesBurned: 350,
      group: "Cardiovascular",
    });
    expect(entries[1]).toEqual({
      date: "2026-02-11",
      time: "06:00 PM",
      exercise: "Weight Training",
      minutes: 45,
      caloriesBurned: 200,
      group: "Strength",
    });
  });

  it("should return empty array for empty CSV", () => {
    expect(parseExercises("")).toEqual([]);
  });
});

describe("parseBiometrics", () => {
  const sampleCSV = `Day,Time,Metric,Unit,Amount
2026-02-11,08:00 AM,Weight,lbs,212.5
2026-02-09,09:00 AM,Blood Pressure,mmHg,120/80`;

  it("should parse biometric entries", () => {
    const entries = parseBiometrics(sampleCSV);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toEqual({
      date: "2026-02-11",
      time: "08:00 AM",
      metric: "Weight",
      unit: "lbs",
      amount: 212.5,
    });
  });

  it("should handle blood pressure as string", () => {
    const entries = parseBiometrics(sampleCSV);
    expect(entries[1]).toEqual({
      date: "2026-02-09",
      time: "09:00 AM",
      metric: "Blood Pressure",
      unit: "mmHg",
      amount: "120/80",
    });
  });

  it("should return empty array for empty CSV", () => {
    expect(parseBiometrics("")).toEqual([]);
  });
});

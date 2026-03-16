import { translateTreatmentName } from "../src/services/treatmentTerminology";

describe("treatment terminology", () => {
  it("maps patient treatment labels to doctor terminology", () => {
    expect(translateTreatmentName("Implant: Whole (Root + Crown)", "doctor")).toBe(
      "Implant: Fixture Placement + Crown Restoration"
    );
    expect(translateTreatmentName("Fillings", "doctor")).toBe(
      "Direct/Indirect Fillings (Composites, Inlays, Onlays)"
    );
    expect(translateTreatmentName("Gum Treatment", "doctor")).toBe("Perio Surgery");
    expect(translateTreatmentName("Invisalign", "doctor")).toBe(
      "Clear Aligner Orthodontics"
    );
    expect(translateTreatmentName("Tongue Tie Surgery", "doctor")).toBe(
      "Lingual Frenectomy"
    );
  });

  it("maps doctor treatment labels back to patient terminology and preserves shared terms", () => {
    expect(
      translateTreatmentName("Implant: Fixture placement+ Crown restoration", "patient")
    ).toBe("Implant: Whole (Root + Crown)");
    expect(
      translateTreatmentName(
        "Direct/Indirect fillings(Composites, Inlays, Onlays)",
        "patient"
      )
    ).toBe("Fillings");
    expect(translateTreatmentName("Lingual Frenectomy", "patient")).toBe(
      "Tongue Tie Surgery"
    );
    expect(translateTreatmentName("Smile makeover", "doctor")).toBe("Smile Makeover");
    expect(translateTreatmentName("Wisdom teeth extractions", "doctor")).toBe(
      "Wisdom Teeth Extractions"
    );
  });
});
"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Calculator, Save } from "lucide-react";

type SettlementCalculatorProps = {
  caseId?: string;
  caseType?: "pi" | "housing" | "clinical_neg";
  onSave?: (calculation: SettlementResult) => void;
};

type SettlementResult = {
  generalDamages: number;
  specialDamages: number;
  interest: number;
  total: number;
  breakdown: {
    item: string;
    amount: number;
  }[];
};

export function SettlementCalculator({
  caseId,
  caseType = "pi",
  onSave,
}: SettlementCalculatorProps) {
  const [inputs, setInputs] = useState({
    // PI/Clinical Neg inputs
    injurySeverity: "",
    generalDamages: "",
    // Special damages
    pastLossOfEarnings: "",
    futureLossOfEarnings: "",
    careCosts: "",
    travelExpenses: "",
    medicalExpenses: "",
    otherExpenses: "",
    // Interest
    interestRate: "2.5", // Default Bank of England base rate
    interestPeriod: "",
  });
  
  const [result, setResult] = useState<SettlementResult | null>(null);
  
  const calculate = () => {
    const general = parseFloat(inputs.generalDamages) || 0;
    
    const special = 
      (parseFloat(inputs.pastLossOfEarnings) || 0) +
      (parseFloat(inputs.futureLossOfEarnings) || 0) +
      (parseFloat(inputs.careCosts) || 0) +
      (parseFloat(inputs.travelExpenses) || 0) +
      (parseFloat(inputs.medicalExpenses) || 0) +
      (parseFloat(inputs.otherExpenses) || 0);
    
    const period = parseFloat(inputs.interestPeriod) || 0;
    const rate = parseFloat(inputs.interestRate) || 0;
    const interest = (general + special) * (rate / 100) * (period / 365);
    
    const breakdown = [
      { item: "General Damages", amount: general },
      { item: "Past Loss of Earnings", amount: parseFloat(inputs.pastLossOfEarnings) || 0 },
      { item: "Future Loss of Earnings", amount: parseFloat(inputs.futureLossOfEarnings) || 0 },
      { item: "Care Costs", amount: parseFloat(inputs.careCosts) || 0 },
      { item: "Travel Expenses", amount: parseFloat(inputs.travelExpenses) || 0 },
      { item: "Medical Expenses", amount: parseFloat(inputs.medicalExpenses) || 0 },
      { item: "Other Expenses", amount: parseFloat(inputs.otherExpenses) || 0 },
      { item: "Interest", amount: interest },
    ].filter((item) => item.amount > 0);
    
    const total = general + special + interest;
    
    setResult({
      generalDamages: general,
      specialDamages: special,
      interest,
      total,
      breakdown,
    });
  };
  
  const handleSave = async () => {
    if (!result || !caseId) return;
    
    try {
      const res = await fetch("/api/settlement/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          calculationType: caseType,
          inputs,
          result,
        }),
      });
      
      if (res.ok && onSave) {
        onSave(result);
      }
    } catch (error) {
      console.error("Failed to save calculation:", error);
    }
  };
  
  return (
    <Card
      title={
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-primary" />
          Settlement Calculator
        </div>
      }
      description="Calculate settlement amounts with interest"
    >
      <div className="space-y-6">
        {/* General Damages */}
        <div className="space-y-2">
          <Label htmlFor="generalDamages">General Damages (£)</Label>
          <Input
            id="generalDamages"
            type="number"
            value={inputs.generalDamages}
            onChange={(e) => setInputs({ ...inputs, generalDamages: e.target.value })}
            placeholder="0.00"
          />
        </div>
        
        {/* Special Damages */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Special Damages</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="pastLoss">Past Loss of Earnings (£)</Label>
              <Input
                id="pastLoss"
                type="number"
                value={inputs.pastLossOfEarnings}
                onChange={(e) => setInputs({ ...inputs, pastLossOfEarnings: e.target.value })}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="futureLoss">Future Loss of Earnings (£)</Label>
              <Input
                id="futureLoss"
                type="number"
                value={inputs.futureLossOfEarnings}
                onChange={(e) => setInputs({ ...inputs, futureLossOfEarnings: e.target.value })}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="careCosts">Care Costs (£)</Label>
              <Input
                id="careCosts"
                type="number"
                value={inputs.careCosts}
                onChange={(e) => setInputs({ ...inputs, careCosts: e.target.value })}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="travel">Travel Expenses (£)</Label>
              <Input
                id="travel"
                type="number"
                value={inputs.travelExpenses}
                onChange={(e) => setInputs({ ...inputs, travelExpenses: e.target.value })}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="medical">Medical Expenses (£)</Label>
              <Input
                id="medical"
                type="number"
                value={inputs.medicalExpenses}
                onChange={(e) => setInputs({ ...inputs, medicalExpenses: e.target.value })}
                placeholder="0.00"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="other">Other Expenses (£)</Label>
              <Input
                id="other"
                type="number"
                value={inputs.otherExpenses}
                onChange={(e) => setInputs({ ...inputs, otherExpenses: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
        
        {/* Interest */}
        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-foreground">Interest</h4>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="interestRate">Interest Rate (%)</Label>
              <Input
                id="interestRate"
                type="number"
                step="0.1"
                value={inputs.interestRate}
                onChange={(e) => setInputs({ ...inputs, interestRate: e.target.value })}
                placeholder="2.5"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="interestPeriod">Period (days)</Label>
              <Input
                id="interestPeriod"
                type="number"
                value={inputs.interestPeriod}
                onChange={(e) => setInputs({ ...inputs, interestPeriod: e.target.value })}
                placeholder="365"
              />
            </div>
          </div>
        </div>
        
        {/* Calculate Button */}
        <Button onClick={calculate} variant="primary" className="w-full">
          Calculate Settlement
        </Button>
        
        {/* Results */}
        {result && (
          <div className="space-y-4 pt-4 border-t border-border">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-foreground">Breakdown</h4>
              <div className="space-y-1">
                {result.breakdown.map((item, i) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.item}</span>
                    <span className="text-foreground font-medium">
                      £{item.amount.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-foreground">Total Settlement</span>
                <span className="text-2xl font-bold text-primary">
                  £{result.total.toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>
            
            {caseId && (
              <Button onClick={handleSave} variant="outline" className="w-full">
                <Save className="mr-2 h-4 w-4" />
                Save Calculation
              </Button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}


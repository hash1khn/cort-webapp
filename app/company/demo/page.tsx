'use client';

import React, { useEffect, useState } from 'react';
import {
    ChaosSpreadsheet,
    WhatsAppMock,
    OptimizationInsightCard,
    DemoSection,
    ZeroVisibilityHero
} from '../components/DemoComponents';
import {
    ValueDeliveredSection,
    CostVisibilitySection,
    SmartInsightsSection,
    ServiceUsageSection
} from '../components/DashboardComponents';
import { WelcomeBanner } from '../components/PremiumUIComponents';

export default function DemoPage() {
    // Mock data for the demo
    const mockData = {
        valueDelivered: {
            estimatedSavings: 450000,
            activeRides: 12,
            shuttleTrips: 186,
                avgTripCost: 2400,
                avgTripTotalSpendLifetime: 1250000,
                shuttleTotalTripsLifetime: 10
        },
        cost: {
            totalSpendMTD: 1250000,
            spendTrend: "-12%",
            costPerEmployee: 8500,
            budget: 1500000
        },
        services: {
            chauffeur: 68,
            shuttles: 32,
            events: 0,
            eventShuttle: 0
        },
        smartInsights: [
            "Shifting 32% of individual rides to shuttle could save Rs. 186,000/month.",
            "Route 4 & 5 consolidation identified for Rs. 50,000/month saving.",
            "Late night commute spending increased by 15% due to project deadlines."
        ],
        seasonality: {
            highDemandDay: "Friday",
            lowDemandDay: "Sunday"
        }
    };

    return (
        <div className="flex flex-col w-full bg-white overflow-x-hidden">

            {/* Scene 1: Chaos */}
            <ZeroVisibilityHero />

            {/* Scene 2 & 3: Reveal and Dashboard Dashboard */}
            <DemoSection id="reveal" title="Scene 2 & 3: The Reveal (Corporate Mobility OS)" dark>
                <div className="w-full max-w-5xl space-y-12 scale-[0.85] lg:scale-100 transition-all duration-700 hover:scale-105">
                    <WelcomeBanner
                        userName="Alex"
                        date={new Date()}
                        upcomingBookings={12}
                        onNewBooking={() => { }}
                    />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <ValueDeliveredSection data={mockData.valueDelivered} />
                        <CostVisibilitySection data={mockData.cost} />
                    </div>
                </div>
            </DemoSection>

            {/* Scene 5: Intelligence */}
            <DemoSection id="intelligence" title="Scene 5: Mobility Intelligence">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 w-full max-w-5xl">
                    <div className="scale-110">
                        <ServiceUsageSection data={mockData.services} />
                    </div>
                    <div className="scale-110">
                        <SmartInsightsSection
                            insights={mockData.smartInsights}
                            seasonality={mockData.seasonality}
                        />
                    </div>
                </div>
            </DemoSection>

            {/* Scene 6: The Power Moment (Optimization) */}
            <DemoSection id="optimization" title="Scene 6: The Power Moment (Savings)" dark>
                <div className="flex flex-col gap-12 w-full max-w-4xl">
                    <OptimizationInsightCard
                        title="Route Consolidation Opportunity"
                        description="Consolidating Route 4 & Route 5 could reduce mobility costs significantly."
                        savings="50k"
                        accent="orange"
                    />
                    <OptimizationInsightCard
                        title="Shuttle Migration Impact"
                        description="Shifting individual rides to employee shuttles for the morning shift."
                        savings="186k"
                        accent="navy"
                    />
                </div>
            </DemoSection>

            <div className="bg-gray-100 py-10 text-center text-xs font-bold text-gray-400 uppercase tracking-widest">
                End of Demo Capture Page • CORT Mobility OS
            </div>
        </div>
    );
}

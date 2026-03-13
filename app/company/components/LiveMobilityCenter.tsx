'use client';

import React, { useState, useEffect } from 'react';
import {
    Activity,
    Users,
    Bus,
    Car,
    Calendar,
    AlertTriangle,
    Maximize2,
    MapPin,
    Navigation,
    Clock
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { Card } from './DashboardComponents';

// Dynamic import for Map to avoid SSR issues with Leaflet
const Map = dynamic(() => import('../../admin/ui/Map'), {
    ssr: false,
    loading: () => <div className="w-full h-full bg-[var(--surface-muted)] animate-pulse flex items-center justify-center rounded-2xl">
        <span className="text-[var(--text-muted)] text-sm font-medium">Initializing Real-time Map...</span>
    </div>
});

interface LiveMobilityCenterProps {
    data: {
        activeRides: number;
        employeesTraveling: number;
        shuttlesRunning: number;
        chauffeurRides: number;
        upcomingBookings: number;
    };
}

const LiveMobilityCenter = ({ data }: LiveMobilityCenterProps) => {
    const router = useRouter();
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    // Simulated data based on requirements
    const stats = [
        { label: 'Active rides', value: data.activeRides || 14, icon: <Navigation size={20} />, color: 'var(--cort-navy)' },
        { label: 'Employees travelling', value: data.employeesTraveling || 27, icon: <Users size={20} />, color: 'var(--cort-orange)' },
        { label: 'Shuttles running', value: data.shuttlesRunning || 3, icon: <Bus size={20} />, color: 'var(--cort-navy)' },
        { label: 'Chauffuer rides', value: data.chauffeurRides || 4, icon: <Car size={20} />, color: 'var(--cort-orange)' },
        { label: 'Upcoming rides', value: data.upcomingBookings || 11, icon: <Calendar size={20} />, color: 'var(--cort-navy)' },
    ];

    // Simulated Karachi coordinates for the map
    const markers: any[] = [
        // Shuttles
        { id: 'shuttle-1', position: [24.8719, 67.0593], label: 'Shuttle Route 1 - Occupancy 85%', id_type: 'shuttle' },
        { id: 'shuttle-2', position: [24.9462, 67.1238], label: 'Shuttle Route 4 - Delayed 5m', id_type: 'shuttle' },
        { id: 'shuttle-3', position: [24.8138, 67.0267], label: 'Shuttle Route 5 - On Track', id_type: 'shuttle' },
        // Chauffeur rides
        { id: 'car-1', position: [24.8607, 67.0011], label: 'Chauffeur Ride - active', id_type: 'chauffeur' },
        { id: 'car-2', position: [24.8924, 67.0747], label: 'Chauffeur Ride - active', id_type: 'chauffeur' },
        { id: 'car-3', position: [24.8348, 67.0659], label: 'Chauffeur Ride - active', id_type: 'chauffeur' },
        { id: 'car-4', position: [24.9180, 67.0971], label: 'Chauffeur Ride - active', id_type: 'chauffeur' },
        // Employee pickups
        { id: 'pickup-1', position: [24.8655, 67.0250], label: 'Employee Pickup: Ahmed S.', id_type: 'pickup' },
        { id: 'pickup-2', position: [24.9200, 67.1100], label: 'Employee Pickup: Sara K.', id_type: 'pickup' },
    ];

    return (
        <Card className="p-0 overflow-hidden border-none shadow-2xl bg-navy min-h-[600px] flex flex-col rounded-4xl">
            {/* Header Area */}
            <div className="m-4 mb-0 p-6  flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-navy text-white rounded-4xl border border-white/5">
                <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md p-4 px-6 rounded-3xl border border-white/10">
                    <div className="relative">
                        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping opacity-25"></div>
                        <div className="relative w-3 h-3 bg-red-500 rounded-full border border-white/20"></div>
                    </div>
                    <div>
                        <h2 className="text-xl font-black tracking-tight uppercase text-white">Live Mobility Command Center</h2>
                        <p className="text-white/60 text-[10px] font-bold tracking-widest uppercase mb-0">Real-time Operational Overview • Karachi</p>
                    </div>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] font-black opacity-50 uppercase tracking-widest">Global Ops Time</span>
                        <div className="font-mono text-lg font-bold text-orange">
                            {currentTime.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                    </div>
                    {/* <button className="p-2 rounded-xl bg-white/10 hover:bg-white/20 transition-colors">
                        <Maximize2 size={18} className="text-white" />
                    </button> */}
                </div>
            </div>

            {/* Counters Strip - Styled as a segmented card */}
            <div className="m-4 mt-5 px-6 py-4 bg-white/5 border border-white/10 rounded-4xl grid grid-cols-2 md:grid-cols-5 gap-4 shadow-sm">
                {stats.map((stat, idx) => (
                    <div key={idx} className="flex flex-col">
                        <div className="flex items-center gap-2 text-white mb-1">
                            <span className="p-1 px-1.5 rounded-md bg-white/20 text-orange">{stat.icon}</span>
                            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">{stat.label}</span>
                        </div>
                        <div className="text-3xl font-black text-navy">{stat.value}</div>
                    </div>
                ))}
            </div>

            {/* Live Map & Sidebar */}
            <div className="flex-1 flex flex-col lg:flex-row min-h-[400px]">
                {/* Map Area */}
                <div className="flex-1 relative order-2 lg:order-1">
                    <div className="absolute inset-0 p-4">
                        <div className="w-full h-full rounded-4xl overflow-hidden border border-white/10 shadow-inner group">
                            <Map
                                height="100%"
                                markers={markers.map(m => ({
                                    ...m,
                                    type: m.id_type // Map.tsx uses type to determine icon type
                                }))}
                                center={[24.8607, 67.0011]}
                                zoom={12}
                                className="grayscale-[0.2] brightness-[0.9] contrast-[1.1]"
                            />

                            {/* Map Floating Controls */}
                            <div className="absolute top-8 left-8 z-[50] flex flex-col gap-2">
                                <div className="bg-[var(--cort-navy)] backdrop-blur-md border border-white/20 p-2 px-4 rounded-xl flex items-center gap-3 shadow-lg">
                                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                                    <span className="text-[10px] font-black text-white uppercase tracking-wider">Network Healthy</span>
                                </div>
                            </div>

                            {/* Map Legend */}
                            <div className="absolute bottom-8 right-8 z-[50] bg-navy backdrop-blur-md border border-white/30 p-4 rounded-2xl shadow-2xl flex flex-col gap-2">
                                <span className="text-[10px] font-black text-white/70 uppercase tracking-widest mb-1 font-mono">Live Legend</span>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-orange rounded-full border border-white/40 shadow-[0_0_12px_rgba(244,127,0,0.8)]"></div>
                                    <span className="text-xs text-white font-black tracking-tight">Active Vehicles</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 bg-green-500 rounded-full border border-white/40 shadow-[0_0_12px_rgba(34,197,94,0.8)]"></div>
                                    <span className="text-xs text-white font-black tracking-tight">Employee Pickups</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sidebar Notifications */}
                {/* Sidebar Notifications - Styled as a distinct Orange Card */}
                <div className="w-full lg:w-80 m-4 lg:ml-0 p-6 flex flex-col gap-4 bg-orange rounded-4xl shadow-2xl order-1 lg:order-2 text-white">
                    <div className="flex items-center justify-between">
                        <h3 className="text-sm font-black uppercase tracking-widest text-navy">Active Alerts</h3>
                        <span className="px-2 py-0.5 rounded-full bg-navy/20 text-navy text-[9px] font-black uppercase border border-navy/10">2 Critical</span>
                    </div>

                    <div className="space-y-3">
                        {/* Alert 1 */}
                        <div className="p-3 rounded-2xl bg-white/15 border border-white/20 hover:bg-white/25 transition-colors cursor-pointer group">
                            <div className="flex items-start gap-3">
                                <AlertTriangle size={16} className="text-navy mt-1 shrink-0" />
                                <div>
                                    <div className="text-[11px] font-black text-white group-hover:text-white transition-colors">Route Deviation Detected</div>
                                    <div className="text-[10px] text-white font-bold leading-tight mt-1">Shuttle Route 4 is 0.8km off the planned path near Karsaz Road.</div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Clock size={10} className="text-white/60" />
                                        <span className="text-[9px] text-white/60 font-black">2 mins ago</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Alert 2 */}
                        <div className="p-3 rounded-2xl bg-white/20 border border-white/30 hover:bg-white/30 transition-colors cursor-pointer group shadow-sm">
                            <div className="flex items-start gap-3">
                                <Users size={16} className="text-navy mt-1 shrink-0" />
                                <div>
                                    <div className="text-[11px] font-black text-white">High Occupancy Alert</div>
                                    <div className="text-[10px] text-white font-bold leading-tight mt-1">Shuttle Route 1 at 94% capacity. Next pickup (4 emps) might exceed limit.</div>
                                    <div className="flex items-center gap-2 mt-2">
                                        <Clock size={10} className="text-white/60" />
                                        <span className="text-[9px] text-white/60 font-black">Just now</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Action Button */}
                        <button
                            onClick={() => router.push('/company/bookings')}
                            className="w-full mt-4 py-3 rounded-xl bg-navy hover:bg-navy-hover text-white text-xs font-black uppercase tracking-widest transition-all shadow-lg active:translate-y-0.5"
                        >
                            View Full Fleet View
                        </button>
                    </div>

                    <div className="mt-auto pt-6 border-t border-white/10">
                        <div className="p-4 rounded-2xl bg-white/10 border border-white/10">
                            <div className="text-[10px] font-black text-navy uppercase tracking-widest mb-3 opacity-60">Service Performance</div>
                            <div className="space-y-4">
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold text-white mb-1.5 uppercase tracking-tighter">
                                        <span>On-Time Arrival Rate</span>
                                        <span className="text-navy font-black">92%</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white w-[92%] shadow-[0_0_8px_white]"></div>
                                    </div>
                                </div>
                                <div>
                                    <div className="flex justify-between text-[10px] font-bold text-white mb-1.5 uppercase tracking-tighter">
                                        <span>Avg. Fleet Utilization</span>
                                        <span className="text-navy font-black">78%</span>
                                    </div>
                                    <div className="h-1 w-full bg-white/20 rounded-full overflow-hidden">
                                        <div className="h-full bg-white w-[78%] shadow-[0_0_8px_white]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};

export default LiveMobilityCenter;

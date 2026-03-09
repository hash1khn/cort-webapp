'use client';

import React from 'react';
import { ZeroVisibilityHero } from '../../components/DemoComponents';

/**
 * Dedicated Recording Page for Scene 1: The Hook
 * 
 * Path: /company/demo/scene-1
 * Purpose: Captures the 'Zero Visibility' chaos screen without other sections.
 */
export default function Scene1Page() {
    return (
        <div className="w-full h-screen bg-white">
            <ZeroVisibilityHero />
        </div>
    );
}

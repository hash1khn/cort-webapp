export type MobileAppConfig = {
    maintenanceEnabled: boolean;
    maintenanceMessage: string | null;
    iosMinVersion: string | null;
    androidMinVersion: string | null;
    iosStoreUrl: string | null;
    androidStoreUrl: string | null;
    forceUpdateMessage: string | null;
};

export type UpdateMobileAppConfigRequest = {
    maintenanceEnabled: boolean;
    maintenanceMessage: string | null;
    iosMinVersion: string | null;
    androidMinVersion: string | null;
    iosStoreUrl: string | null;
    androidStoreUrl: string | null;
    forceUpdateMessage: string | null;
};

"use client";

import { Driver } from "../../../lib/services/types/drivers";
import { displayDriverEmail } from "../../../lib/utils/driverEmailDisplay";

function DetailRow({ label, value }: { label: string; value: string | number | null | undefined }) {
    const display = value === null || value === undefined || value === "" ? "—" : String(value);
    return (
        <div>
            <div className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{label}</div>
            <div className="mt-0.5 text-sm text-[#0c225e]">{display}</div>
        </div>
    );
}

function ApplicationPhotoTile({
    label,
    url,
    onZoom,
}: {
    label: string;
    url?: string | null;
    onZoom: (url: string, name: string) => void;
}) {
    if (!url) {
        return (
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-center">
                <div className="text-xs font-semibold text-slate-500">{label}</div>
                <div className="mt-1 text-xs text-slate-400">Not uploaded</div>
            </div>
        );
    }
    return (
        <button
            type="button"
            onClick={() => onZoom(url, label)}
            className="group block w-full overflow-hidden rounded-lg border border-slate-200 bg-white text-left transition-colors hover:border-[#f47f00]"
        >
            <div className="border-b border-slate-100 bg-slate-50 px-2 py-1.5 text-xs font-semibold text-slate-600">{label}</div>
            <img src={url} alt={label} className="h-44 w-full cursor-zoom-in bg-slate-50 object-contain" />
            <div className="px-2 py-1 text-[10px] text-slate-400">Click to enlarge</div>
        </button>
    );
}

type ChauffeurApplicationDetailProps = {
    driver: Driver;
    onZoomImage: (url: string, name: string) => void;
};

export function ChauffeurApplicationDetail({ driver, onZoomImage }: ChauffeurApplicationDetailProps) {
    const profile = driver.drivers_profile;

    return (
        <div className="max-h-[70vh] space-y-6 overflow-y-auto pr-1">
            <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Applicant</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <DetailRow label="Full name" value={driver.full_name} />
                    <DetailRow label="Email" value={displayDriverEmail(driver.email)} />
                    <DetailRow label="Phone" value={driver.phone} />
                    <DetailRow label="CNIC" value={profile?.cnic_number} />
                    <DetailRow label="License number" value={profile?.license_number} />
                    <DetailRow
                        label="Submitted"
                        value={
                            driver.created_at
                                ? new Date(driver.created_at).toLocaleString()
                                : undefined
                        }
                    />
                </div>
            </section>
            <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Vehicle</h3>
                <div className="grid gap-4 sm:grid-cols-3">
                    <DetailRow label="Make" value={profile?.vehicle_make} />
                    <DetailRow label="Model" value={profile?.vehicle_model} />
                    <DetailRow label="Model year" value={profile?.vehicle_year ?? undefined} />
                </div>
            </section>
            <section>
                <h3 className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-400">Photos & documents</h3>
                <div className="grid gap-4 sm:grid-cols-2">
                    <ApplicationPhotoTile label="Profile" url={driver.profile_picture_url} onZoom={onZoomImage} />
                    <ApplicationPhotoTile
                        label="Driving license (front)"
                        url={profile?.license_front_image_url}
                        onZoom={onZoomImage}
                    />
                    <ApplicationPhotoTile
                        label="Driving license (back)"
                        url={profile?.license_back_image_url}
                        onZoom={onZoomImage}
                    />
                    <ApplicationPhotoTile
                        label="CNIC (front)"
                        url={profile?.cnic_front_image_url}
                        onZoom={onZoomImage}
                    />
                    <ApplicationPhotoTile
                        label="CNIC (back)"
                        url={profile?.cnic_back_image_url}
                        onZoom={onZoomImage}
                    />
                    <ApplicationPhotoTile label="Car" url={profile?.vehicle_photo_url} onZoom={onZoomImage} />
                    <ApplicationPhotoTile
                        label="Car registration"
                        url={profile?.vehicle_registration_doc_url}
                        onZoom={onZoomImage}
                    />
                </div>
            </section>
        </div>
    );
}

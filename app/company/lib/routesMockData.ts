
export const MOCK_SHUTTLE_DRIVERS = [
    { id: "1", full_name: "Tariq Mehmood", username: "tariq.m" },
    { id: "2", full_name: "Bilal Khan", username: "bilal.k" },
];

export const MOCK_VEHICLES = [
    { id: 101, plate_no: "LEC-1234", make: "Toyota", model: "Coaster", year: 2022, color: "White" },
    { id: 102, plate_no: "RIS-4567", make: "Toyota", model: "Hiace", year: 2021, color: "Silver" },
];

export const MOCK_ROUTES = [
    {
        id: 1,
        name: "Route A - Gulberg via Jail Road",
        driver_id: "1",
        vehicle_id: 101,
        stops: [
            { id: 1, name: "Liberty Market", eta_minutes_from_start: 0 },
            { id: 2, name: "Jail Road / Canal", eta_minutes_from_start: 15 },
            { id: 3, name: "Services Hospital", eta_minutes_from_start: 25 },
            { id: 4, name: "Punjab University", eta_minutes_from_start: 45 },
        ],
    },
    {
        id: 2,
        name: "Route B - DHA to Johar Town",
        driver_id: "2",
        vehicle_id: 102,
        stops: [
            { id: 5, name: "DHA Phase 5", eta_minutes_from_start: 0 },
            { id: 6, name: "Lums", eta_minutes_from_start: 10 },
            { id: 7, name: "Kalma Chowk", eta_minutes_from_start: 35 },
            { id: 8, name: "Expo Center", eta_minutes_from_start: 55 },
        ],
    },
];

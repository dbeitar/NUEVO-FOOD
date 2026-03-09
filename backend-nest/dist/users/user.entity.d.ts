export declare enum Gender {
    Masculino = "Masculino",
    Femenino = "Femenino",
    Otro = "Otro"
}
export declare class User {
    id: number;
    name: string;
    email: string;
    gender: Gender;
    hasRestrictions: boolean;
    restrictionDetails: string | null;
}

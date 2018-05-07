import { CharticulatorCoreConfig, getConfig as coreGetConfig } from "../core";

export interface CharticulatorAppConfig extends CharticulatorCoreConfig {
    LegalNotices: {
        /** HTML representation of the privacy statement */
        privacyStatementHTML: string;
    };
    /** Should we disable the file view */
    DisableFileView?: boolean;
    /** Load extensions */
    Extensions?: {
        script: string;
        style: string;
        initialize: string;
    }[];
    /** Sample datasets to show */
    SampleDatasets?: {
        name: string;
        description: string;
        tables: { name: string, url: string, type: string }[];
    }[];
}

export function getConfig(): CharticulatorAppConfig {
    return coreGetConfig() as CharticulatorAppConfig;
}
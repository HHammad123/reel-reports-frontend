// Autosave functionality has been removed
// This component is disabled as it depends on IndexedDB autosave features

import { jsx as _jsx } from "react/jsx-runtime";
import { Card, CardContent } from "../ui/card";
import { FileVideo2 } from "lucide-react";

/**
 * Save History Component
 *
 * DISABLED: Autosave functionality has been removed
 * This component no longer displays autosave records
 */
export const SaveHistory = () => {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-extralight">Save History</h3>
            </div>
            <Card className="border-dashed">
                <CardContent className="p-4">
                    <div className="flex flex-col items-center justify-center text-center space-y-1.5">
                        <FileVideo2 className="h-8 w-8 text-muted-foreground/40" />
                        <div className="text-xs text-muted-foreground">
                            Autosave functionality has been disabled
                        </div>
                        <div className="text-[11px] text-muted-foreground/60">
                            Save history is no longer available
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

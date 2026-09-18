import { Settings } from "@/components/settings";
import { ProtectedRoute } from "@/components/protected-route";
export default function Page() { return <ProtectedRoute><Settings /></ProtectedRoute>; }

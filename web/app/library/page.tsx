import { Library } from "@/components/library";
import { ProtectedRoute } from "@/components/protected-route";
export default function Page() { return <ProtectedRoute><Library /></ProtectedRoute>; }

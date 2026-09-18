import { ProtectedRoute } from "@/components/protected-route";
import { Settings } from "@/components/settings";

export default function ProfilePage() { return <ProtectedRoute><Settings /></ProtectedRoute>; }

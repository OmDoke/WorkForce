import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import CompleteProfileForm from "./CompleteProfileForm";

export default function CompleteProfilePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Welcome to Workforce!</CardTitle>
          <CardDescription>
            An administrator has pre-approved your account. 
            Please complete your profile by providing a few final details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CompleteProfileForm />
        </CardContent>
      </Card>
    </div>
  );
}

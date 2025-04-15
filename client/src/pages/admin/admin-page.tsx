import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Redirect } from "wouter";
import Navbar from "@/components/layout/navbar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import UsersManagement from "./users-management";
import GymsManagement from "./gyms-management";
import { Dumbbell, FileDown, Loader2, Users, Building, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

// Sample data for demo charts
const userGrowthData = [
  { name: "Jan", users: 40 },
  { name: "Feb", users: 55 },
  { name: "Mar", users: 70 },
  { name: "Apr", users: 90 },
  { name: "May", users: 105 },
  { name: "Jun", users: 125 },
];

const gymMatchesData = [
  { name: "Fitness Evolution", matches: 85 },
  { name: "PowerFit", matches: 72 },
  { name: "City Fitness Club", matches: 65 },
  { name: "Iron Athletics", matches: 58 },
  { name: "UrbanFit Gym", matches: 50 },
];

export default function AdminPage() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("dashboard");

  // Redirect non-admin users
  if (user && !user.isAdmin) {
    return <Redirect to="/" />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleExportData = (type: string) => {
    // In a real app, this would generate and download reports
    console.log(`Exporting ${type} data...`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="dashboard" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Dashboard
            </TabsTrigger>
            <TabsTrigger value="gyms" className="flex items-center">
              <Dumbbell className="h-4 w-4 mr-2" />
              Gyms Management
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center">
              <Users className="h-4 w-4 mr-2" />
              User Management
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Users
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Users className="h-5 w-5 text-primary mr-2" />
                    <div className="text-2xl font-bold">125</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    +15% from last month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total Gyms
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Building className="h-5 w-5 text-primary mr-2" />
                    <div className="text-2xl font-bold">8</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    +2 new gyms this month
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Avg. Match Score
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Dumbbell className="h-5 w-5 text-primary mr-2" />
                    <div className="text-2xl font-bold">86%</div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    +3% from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>User Growth</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExportData('users')}
                      className="h-8"
                    >
                      <FileDown className="h-4 w-4 mr-2" /> Export
                    </Button>
                  </div>
                  <CardDescription>New user registrations over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={userGrowthData} margin={{ top: 5, right: 20, bottom: 25, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="users" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <CardTitle>Top Matched Gyms</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleExportData('matches')}
                      className="h-8"
                    >
                      <FileDown className="h-4 w-4 mr-2" /> Export
                    </Button>
                  </div>
                  <CardDescription>Most matched gyms by percentage</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart 
                        data={gymMatchesData} 
                        layout="vertical"
                        margin={{ top: 5, right: 20, bottom: 5, left: 35 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                        <XAxis type="number" domain={[0, 100]} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip />
                        <Bar dataKey="matches" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="gyms">
            <GymsManagement />
          </TabsContent>

          <TabsContent value="users">
            <UsersManagement />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

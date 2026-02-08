import { CoBrandingHeader } from "@/components/station/CoBrandingHeader";
import { StationIdentityBlock } from "@/components/station/StationIdentityBlock";
import { MapPreview } from "@/components/station/MapPreview";
import { ActionButtons } from "@/components/station/ActionButtons";
import { SafetyInfo } from "@/components/station/SafetyInfo";
import { AboutStation } from "@/components/station/AboutStation";

// Mocked configuration - will be replaced with real API data
const branding = {
  clientName: "Camping del Sole",
  clientLogoUrl: "/client-logo.png",
};

type StationStatus = "available" | "busy" | "offline";

const station: {
  name: string;
  status: StationStatus;
  price: number;
  durationMinutes: number;
  location: string;
  openingHours: string;
  description: string;
} = {
  name: "Doccia Bracco – Area Pet",
  status: "available",
  price: 1.0,
  durationMinutes: 5,
  location: "Camping del Sole – Area Pet",
  openingHours: "07:00 - 22:00",
  description: "Outdoor self-service dog wash with water & dryer",
};

const LOGIN_URL = "https://s2p-user.lovable.app";

const UserStationPage = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[480px] pb-8">
        {/* Co-branding Header */}
        <CoBrandingHeader 
          clientName={branding.clientName} 
          clientLogoUrl={branding.clientLogoUrl} 
        />

        {/* Main Content */}
        <div className="space-y-4 px-4">
          {/* Station Identity */}
          <div className="animate-fade-in">
            <StationIdentityBlock
              name={station.name}
              status={station.status}
            />
          </div>

          {/* Map Preview */}
          <div className="animate-fade-in-delay-1">
            <MapPreview stationName={station.name} />
          </div>

          {/* Action Buttons with Pricing */}
          <div className="animate-fade-in-delay-2">
            <ActionButtons
              isDisabled={station.status === "offline"}
              loginUrl={LOGIN_URL}
              stationSlug="user-station"
              stationName={station.name}
            />
          </div>

          {/* Safety Info */}
          <SafetyInfo />

          {/* About Station */}
          <AboutStation
            location={station.location}
            openingHours={station.openingHours}
            description={station.description}
          />
        </div>
      </div>
    </div>
  );
};

export default UserStationPage;

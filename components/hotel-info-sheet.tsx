"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { MapPin, Heart, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { getFacilityIcon, FacilityIcon } from './facilities-icons';

import { PhotoInfo } from "./info-gallery";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import HotelAmenities from "./hotel-amenities";
import { HotelReviews } from "./hotel-reviews";
import { HotelMap } from "./hotel-map";
import { Card } from "./ui/card";
interface HotelInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  hotelinfo: HotelInfo[];
}

interface HotelInfo {
  address: string;
  category: number;
  city_code: number;
  coordinates: { longitude: number; latitude: number };
  description: string ;
  facilities: string[];
  hotel_id: number;
  hotel_name: string;
  images: { url: string; description: string; }[];
}



const StarRating = ({ rating }: { rating: number }) => {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-[#FC5D01] text-[#FC5D01]" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
};

export default function HotelInfoSheet({
  isOpen,
  onClose,
  hotelinfo,
}: HotelInfoSheetProps) {
  const [selectedHotelForGallery, setSelectedHotelForGallery] = useState<{
    hotelName: string;
    images: any[];
  }>({ hotelName: "", images: [] });
  const [currentHotelForGallery, setCurrentHotelForGallery] = useState<HotelInfo | null>(null);

  const [isPhotoGalleryOpen, setIsPhotoGalleryOpen] = useState(false);
  const [tab, setTab] = useState("about");
   const hotel = hotelinfo[0];

  if (!hotel) return null;

  // Handler function
  const handlePhotoGalleryClick = (hotelName: string, images: any[]) => {
    setSelectedHotelForGallery({ hotelName, images });
    setIsPhotoGalleryOpen(true);
  };

  const amenities = [
    "Swimming Pool",
    "Free Internet Access",
    "Fitness Center",
    "Business Center",
    "Free Parking",
    "Restaurant",
    "Free Wi-Fi",
    "Daily Housekeeping",
    "Designated Smoking Area",
  ];

  const ratingData = [
    { stars: 5, percentage: 85 },
    { stars: 4, percentage: 15 },
    { stars: 3, percentage: 0 },
    { stars: 2, percentage: 0 },
    { stars: 1, percentage: 0 },
  ];
  const tabs = [
    { id: "about", label: "Overview" },
    { id: "amenities", label: "Facilities" }
  ];

  function FacilityList({ 
      facilities, 
      maxFacilities 
    }: { 
      facilities: string[]; 
      maxFacilities?: number;
    }) {
      // Determine which facilities to display
      const facilitiesToDisplay = maxFacilities 
        ? facilities.slice(0, maxFacilities)
        : facilities;
  
      return (
        <div className="flex flex-col items-start gap-1 text-sm text-[#808080]">
          {facilitiesToDisplay.map((facility, index) => {
            const IconComponent = getFacilityIcon(facility);
            return (
              <div key={index} className="flex items-center gap-1">
                <IconComponent className="h-4 w-4" />
                <span>{facility}</span>
              </div>
            );
          })}
        </div>
      );
    }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent
          side="right"
          className="w-full md:max-w-4xl p-0 overflow-y-auto"
        >
          <div className="p-4">
            <SheetHeader className="p-0  py-4">
              <SheetTitle className="text-left tracking-widest text-sm text-[#808080] font-normal">
                Hotel Info • {hotel.hotel_name}
              </SheetTitle>
            </SheetHeader>

            {/* Image Gallery */}
            <div className="my-6">
              <div className="grid grid-cols-2 gap-2 h-80">
                {/* Main Image */}
                <div className="relative rounded-lg overflow-hidden">
                  <Image
                    src={hotel.images[0]?.url || "/placeholder.svg"}
                    alt="Hotel exterior"
                    fill
                    className="object-cover"
                  />
                  <Button
                    variant="secondary"
                    size="sm"
                    className="absolute bottom-4 left-4 bg-white/90 hover:bg-white text-black"
                    onClick={() => handlePhotoGalleryClick(hotel.hotel_name, hotel.images)}
                  >
                    📷 See all photos ({hotel?.images.length})
                  </Button>
                </div>

                {/* Side Images */}
                <div className="space-y-2">
                  <div className="relative h-[152px] rounded-lg overflow-hidden">
                    <Image
                      src={hotel.images[1]?.url || "/placeholder.svg"}
                      alt="Hotel restaurant"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="relative h-[152px] rounded-lg overflow-hidden">
                    <Image
                      src={hotel.images[2]?.url || "/placeholder.svg"}
                      alt="Hotel lobby"
                      fill
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Hotel Details */}
            <div className="mb-6">
              <div className="flex items-start flex-col gap-4 md:flex-row justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-lg md:text-2xl font-bold">
                      {hotel.hotel_name}
                    </h1>
                  </div>
                  <div className="flex items-center gap-1 text-[#808080]">
                    <MapPin className="h-4 w-4" />
                    <span className="text-sm">
                      {hotel.address}, {hotel.city_code}
                    </span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <Tabs defaultValue={tab} className="mb-6 w-full">
                <TabsList className="flex-wrap items-start">
                  {tabs.map((tab) => (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      onClick={() => setTab(tab.id)}
                    >
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <hr className=" mt-8 md:mt-4" />
                <TabsContent value="overview">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Rating Section */}
                    <div>
                      <div className="flex items-center gap-2 mb-4">
                        <span className="text-2xl font-medium">{hotel?.category.toFixed(1)}</span>
                        <StarRating rating={hotel?.category || 0} />
                      </div>

                    </div>

                    {/* Top Amenities */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-medium text-[#4D4D4D]">
                          Top Amenities
                        </h3>
                        <Button
                          variant="link"
                          className="text-orange-600 p-0 h-auto"
                          onClick={() => {
                            setTab("amenities");
                          }}
                        >
                          See all amenities
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {amenities.map((amenity, index) => (
                          <div key={index} className="text-[#808080] text-sm">
                            {amenity}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </TabsContent>
                <TabsContent value="about">
                  <div className="space-y-4">
                    <h4 className="text-lg font-medium text-[#4D4D4D]">
                      Hotel Description
                    </h4>
                    <p className="text-xs md:text-sm text-[#666666]">
                      {/* {hotel.description} */}
                      <span dangerouslySetInnerHTML={{ __html: hotel?.description }} />
                    </p>
                  </div>
                </TabsContent>
                <TabsContent value="amenities">
                      {hotel?.facilities && (
                        <FacilityList facilities={hotel.facilities} />
                      )}
                </TabsContent>
                <TabsContent value="reviews">
                  {/* Rating Section */}

                  {/* reviews */}
                  <HotelReviews />
                </TabsContent>
                <TabsContent value="map">
                 
                </TabsContent>
              </Tabs>
            </div>

            {/* Rating and Amenities Section */}
          </div>
        </SheetContent>
      </Sheet>

      <PhotoInfo
        isOpen={isPhotoGalleryOpen}
        onClose={() => {
          setIsPhotoGalleryOpen(false);
          setCurrentHotelForGallery(null);
        }}
        hotelName={selectedHotelForGallery?.hotelName}
        images={selectedHotelForGallery?.images || []}
      />
    </>
  );
}

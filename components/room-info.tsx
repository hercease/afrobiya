"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, MapPin, Heart, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import Link from "next/link";
import { getFacilityIcon, FacilityIcon } from './facilities-icons';

interface RoomInfoSheetProps {
  isOpen: boolean;
  onClose: () => void;
  roomData?: {
    Category: string;
    Currency: string;
    HotelSearchCode: string;
    Remark: string;
    Rooms: string[];
    Special: string;
    TotalPrice: number;
    RoomBasis: string;
  };
  roomFeatures: any[];
}

const roomFeatures = [
  {
    category: "Views",
    items: [
      "Sea view",
      "Lake view",
      "Landmark view",
      "City view",
      "Pool with a view",
      "Rooftop Pool",
    ],
  },
  {
    category: "Bathroom",
    items: [
      "Private Bathroom",
      "Flat-Screen TV",
      "Mini Bar",
      "Free Wifi",
      "Free Toiletries",
      "Bathrobe",
      "Safe",
    ],
  },
  {
    category: "Room Items",
    items: [
      "Toilet",
      "Sofa",
      "Bathtub or Shower",
      "Towels",
      "Linens",
      "Socket near the bed",
      "Cleaning products",
    ],
  },
  {
    category: "Additional",
    items: [
      "Tile/Marble floor",
      "Desk",
      "Sitting area",
      "Private entrance",
      "TV",
      "Slippers",
      "Telephone",
    ],
  },
  {
    category: "Services",
    items: [
      "Ironing facilities",
      "Iron",
      "Hairdryer",
      "DVD player",
      "Towels/Sheets (extra fee)",
      "Wake-up service/Alarm clock",
      "Air Conditioning",
    ],
  },
];

export default function RoomInfoSheet({
  isOpen,
  onClose,
  roomData,
  roomFeatures,
}: RoomInfoSheetProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
//console.log("Room Data in RoomInfoSheet:", roomFeatures);
  const images = [
    "/lagos-continental.png",
    "/fairmont-resort-dubai.png",
    "/plaza-hotel-business.png",
  ];

  const defaultRoomData = {
    name: "Superior Room",
    image: "/lagos-continental.png",
    size: "42 m²",
    floor: "High Floor",
    bedType: "1 King Bed",
    cribAvailable: true,
    price: 95,
  };

  const room = roomData || defaultRoomData;

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

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

  const formatRoomDisplay = (roomsArray: string[]): string => {
    const roomCounts: { [key: string]: number } = {};
    
    roomsArray.forEach(room => {
      // Clean up room names (remove extra spaces, etc.)
      const cleanRoom = room.trim();
      roomCounts[cleanRoom] = (roomCounts[cleanRoom] || 0) + 1;
    });
    
    const roomEntries = Object.entries(roomCounts);
    
    if (roomEntries.length === 1) {
      // Single room type (could be multiple quantities)
      const [roomType, count] = roomEntries[0];
      return `${count} × ${roomType}`;
    } else {
      // Multiple room types
      return roomEntries.map(([roomType, count]) => `${count} × ${roomType}`).join(' + ');
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full md:max-w-4xl p-0 overflow-y-auto"
      >
        <div className="bg-white w-full h-full">
          {/* Header */}
          <SheetHeader className="flex flex-row items-center justify-between mb-4 px-6 py-4 border-b">
            <SheetTitle className="text-left tracking-widest text-sm text-[#808080] font-normal">
              Room Info • {roomData?.Rooms[0]}
            </SheetTitle>
          </SheetHeader>

          {/* Image Section */}
          {/*<div className="w-full relative h-64 px-8 py-4 flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={prevImage}
              className="h-10 w-10 p-0 rounded-full border bg-white/90 hover:bg-white"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className=" w-full h-64 flex-1 justify-center flex ">
              <Image
                src={images[currentImageIndex] || "/placeholder.svg"}
                alt={room.name}
                width={500}
                height={300}
                className="object-cover rounded-2xl"
              />
            </div>

           

            <Button
              variant="ghost"
              size="sm"
              onClick={nextImage}
              className=" h-10 w-10 p-0 rounded-full border bg-white/90 hover:bg-white"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>*/}

          {/* Room Details */}
          <div className="space-y-2">
            <div className="flex items-start flex-col gap-6 md:flex-row px-6 justify-between">
              <div className="space-y-2">
                <h1 className="text-xl font-medium">{formatRoomDisplay(roomData?.Rooms || [])}</h1>
                <div className="flex items-center text-sm gap-2 text-gray-600">
                  <span>{roomData?.RoomBasis}</span>
                  <span>•</span>
                </div>
              </div>

              <div className="flex gap-6 flex-row items-center">
                <Link href={"/booking-payment"}>
                  <Button className="bg-[#0000FF] hover:bg-blue-700 px-4">
                    Book
                  </Button>
                </Link>
                <div className="text-right">
                  <div className="text-1xl font-bold text-[#0010DC]">
                    {roomData?.Currency}{roomData?.TotalPrice.toFixed(2)}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">per night</div>
                </div>
              </div>
            </div>
            <hr />
            {/* Room Features and Facilities */}
            <div className="space-y-4 px-6">
              <h2 className="text-lg font-medium text-[#4D4D4D]">
                Room Facilities
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                {roomFeatures.length > 0 && (
                  <FacilityList facilities={roomFeatures} />
                )}
              </div>
            </div>
            <div className="space-y-4 px-6">
              <h2 className="text-lg font-medium text-[#4D4D4D]">
                Rating
              </h2>

              <div className="grid grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {Number(roomData?.Category).toFixed(1)}
                  </span>
                  <StarRating rating={Number(roomData?.Category) || 0} />
                </div>
              </div>
            </div>
            <div className="space-y-4 px-6">
              <h2 className="text-lg font-medium text-[#4D4D4D]">
                Remarks
              </h2>

              <div className="grid gap-y-4">
                <span dangerouslySetInnerHTML={{ __html: roomData?.Remark ?? "" }} />
              </div>
            </div>
            <div className="space-y-4 px-6">
              <h2 className="text-lg font-medium text-[#4D4D4D]">
                Comment
              </h2>

              <div className="grid gap-y-4">
                <span dangerouslySetInnerHTML={{ __html: roomData?.Special ?? "" }} />
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

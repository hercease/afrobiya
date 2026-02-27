"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { X, ChevronLeft, ChevronRight, MapPin, Heart, Star, Calendar, Info, Tag, MessageSquare, Receipt } from "lucide-react";
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
    CancellationPolicies: any[];
    Fee: any[];
    CxlDeadLine?: string | undefined;
    Availability?: number | undefined;
    NonRef?: boolean | undefined;
  };
  roomFeatures: any[];
}

export default function RoomInfoSheet({
  isOpen,
  onClose,
  roomData,
  roomFeatures,
}: RoomInfoSheetProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  console.log("Room Data in RoomInfoSheet:", roomData);

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

  const FacilityList = ({ 
    facilities, 
    maxFacilities 
  }: { 
    facilities: string[]; 
    maxFacilities?: number;
  }) => {
    const facilitiesToDisplay = maxFacilities 
      ? facilities.slice(0, maxFacilities)
      : facilities;

    return (
      <div className="grid grid-cols-2 gap-3">
        {facilitiesToDisplay.map((facility, index) => {
          const IconComponent = getFacilityIcon(facility);
          return (
            <div key={index} className="flex items-center gap-2 text-sm text-gray-700">
              <IconComponent className="h-4 w-4 text-gray-500 flex-shrink-0" />
              <span>{facility}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const formatRoomDisplay = (roomsArray: string[]): string => {
    const roomCounts: { [key: string]: number } = {};
    
    roomsArray.forEach(room => {
      const cleanRoom = room.trim();
      roomCounts[cleanRoom] = (roomCounts[cleanRoom] || 0) + 1;
    });
    
    const roomEntries = Object.entries(roomCounts);
    
    if (roomEntries.length === 1) {
      const [roomType, count] = roomEntries[0];
      return `${count} × ${roomType}`;
    } else {
      return roomEntries.map(([roomType, count]) => `${count} × ${roomType}`).join(' + ');
    }
  };

  const formatCancellationPolicy = () => {
    if (!roomData?.CancellationPolicies || roomData.CancellationPolicies.length === 0) {
      return <p className="text-sm text-gray-500">No cancellation policy specified</p>;
    }

    return roomData.CancellationPolicies.map((policy: any, index: number) => (
      <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
        <div className="flex items-center gap-2 mb-2">
          <Calendar className="h-4 w-4 text-orange-500" />
          <span className="font-medium">From {policy.Starting}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">Cancellation fee:</span>
          <span className="font-semibold text-red-600">
            {policy.Value}% of {policy.BasedOn === "BOOKINGPRICE" ? "total price" : "booking"}
          </span>
        </div>
      </div>
    ));
  };

  const formatFees = () => {
    if (!roomData?.Fee || roomData.Fee.length === 0) {
      return <p className="text-sm text-gray-500">No fee information available</p>;
    }

    return (
      <div className="space-y-3">
        {roomData.Fee.map((fee: any, index: number) => (
          <div key={index} className="bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div className="flex justify-between items-center">
              <div>
                <div className="flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-blue-500" />
                  <span className="font-medium capitalize">{fee.Type}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">{fee.Detail}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-[#0010DC]">
                  {fee.Currency}{fee.Amount.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 capitalize">{fee.Inclusive}</div>
              </div>
            </div>
          </div>
        ))}
        
        {/* Total Fees Summary */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex justify-between items-center text-sm">
            <span className="font-medium">Total Fees:</span>
            <span className="font-bold">
              {roomData?.Currency}
              {roomData.Fee.reduce((sum, fee) => sum + (fee.Amount || 0), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent
        side="right"
        className="w-full md:max-w-4xl p-0 overflow-y-auto"
      >
        <div className="bg-white w-full h-full">
          {/* Header with Room Name and Rating */}
          <SheetHeader className="px-6 py-4 border-b">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <SheetTitle className="text-left text-lg font-semibold">
                  {formatRoomDisplay(roomData?.Rooms || [])}
                </SheetTitle>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <span className="text-sm text-gray-600">{Number(roomData?.Category).toFixed(1)}</span>
                    <StarRating rating={Number(roomData?.Category) || 0} />
                  </div>
                  <span className="text-sm text-gray-400">•</span>
                  <span className="text-sm text-gray-600">{roomData?.RoomBasis}</span>
                </div>
              </div>
            </div>
          </SheetHeader>

          {/* Quick Info Bar - Compact Summary */}
          <div className="flex flex-wrap gap-3 px-6 py-3 bg-gray-50 border-b">
            {roomData?.CxlDeadLine && (
              <div className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border">
                <Calendar className="h-3 w-3 text-orange-500" />
                <span className="font-medium">Cancel by:</span>
                <span>{roomData.CxlDeadLine}</span>
              </div>
            )}
            {roomData?.Availability !== undefined && (
              <div className="flex items-center gap-1 text-xs bg-white px-2 py-1 rounded-full border">
                <span className={`w-2 h-2 rounded-full ${
                  roomData.Availability > 2 ? 'bg-green-500' : 
                  roomData.Availability > 0 ? 'bg-orange-500' : 'bg-red-500'
                }`}></span>
                <span className="font-medium">{roomData.Availability} rooms left</span>
              </div>
            )}
            {roomData?.NonRef && (
              <div className="flex items-center gap-1 text-xs bg-red-50 px-2 py-1 rounded-full border border-red-200">
                <span className="text-red-500">⚠️</span>
                <span className="text-red-600">Non-refundable</span>
              </div>
            )}
          </div>

          {/* Tabs Navigation - Scrollable on Mobile */}
          <Tabs defaultValue="facilities" className="w-full">
            <div className="px-6 border-b overflow-x-auto scrollbar-hide">
              <TabsList className="w-max flex bg-transparent h-auto p-0 gap-4 min-w-full">
                <TabsTrigger 
                  value="facilities" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#0000FF] rounded-none px-1 py-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#0000FF] whitespace-nowrap"
                >
                  Facilities
                </TabsTrigger>
                <TabsTrigger 
                  value="cancellation" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#0000FF] rounded-none px-1 py-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#0000FF] whitespace-nowrap"
                >
                  Cancellation
                </TabsTrigger>
                <TabsTrigger 
                  value="remarks" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#0000FF] rounded-none px-1 py-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#0000FF] whitespace-nowrap"
                >
                  Remarks
                </TabsTrigger>
                <TabsTrigger 
                  value="special" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#0000FF] rounded-none px-1 py-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#0000FF] whitespace-nowrap"
                >
                  Special
                </TabsTrigger>
                <TabsTrigger 
                  value="fees" 
                  className="data-[state=active]:border-b-2 data-[state=active]:border-[#0000FF] rounded-none px-1 py-2 bg-transparent data-[state=active]:bg-transparent data-[state=active]:text-[#0000FF] whitespace-nowrap"
                >
                  Fees
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Tab Content */}
            <div className="px-6 py-4">
              {/* Facilities Tab */}
              <TabsContent value="facilities" className="mt-0">
                <div className="space-y-4">
                  {roomFeatures.length > 0 ? (
                    <FacilityList facilities={roomFeatures} />
                  ) : (
                    <p className="text-sm text-gray-500">No facility information available</p>
                  )}
                </div>
              </TabsContent>

              {/* Cancellation Tab */}
              <TabsContent value="cancellation" className="mt-0">
                <div className="space-y-3">
                  {formatCancellationPolicy()}
                </div>
              </TabsContent>

              {/* Remarks Tab */}
              <TabsContent value="remarks" className="mt-0">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div 
                    className="text-sm text-gray-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: roomData?.Remark ?? "No remarks available" }} 
                  />
                </div>
              </TabsContent>

              {/* Special Tab */}
              <TabsContent value="special" className="mt-0">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <div 
                    className="text-sm text-gray-700 prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: roomData?.Special ?? "No special information available" }} 
                  />
                </div>
              </TabsContent>

              {/* Fees Tab */}
              <TabsContent value="fees" className="mt-0">
                {formatFees()}
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer with Price and Book Button */}
          <div className="sticky bottom-0 bg-white border-t px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-gray-500">Total Price</div>
                <div className="text-2xl font-bold text-[#0010DC]">
                  {roomData?.Currency}{roomData?.TotalPrice?.toFixed(2)}
                </div>
              </div>
              <Link href={"/booking-payment"}>
                <Button className="bg-[#0000FF] hover:bg-blue-700 px-8 py-6 text-base">
                  Book Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
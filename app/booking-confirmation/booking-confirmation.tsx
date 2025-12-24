"use client";

import Image from "next/image";
import {
  Check,
  MapPin,
  CircleCheck,
  Lock,
  Clock,
  ShieldCheck,
} from "lucide-react";
import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// Type definitions
interface Guest {
  person_id: string;
  first_name: string;
  last_name: string;
  title: string;
}

interface Child {
  person_id: string;
  child_age: string;
  first_name: string;
  last_name: string;
  type?: string;
}

interface Room {
  room_id: string;
  category: string;
  adults: Guest[];
  children: Child[];
  total_adults: number;
  total_children: number;
}

interface RoomType {
  type: string;
  adults_count: number;
  rooms: Room[];
}

interface Leader {
  name: string;
  person_id: string | null;
}

interface Summary {
  total_adults: number;
  total_children: number;
}

interface BookingData {
  booking_code: string;
  booking_reference: string;
  client_booking_code: string;
  booking_status: string;
  total_price: string;
  currency: string;
  check_in: string;
  check_out: string;
  nights: number;
  cancellation_deadline: string;
  hotel_name: string;
  hotel_id: string;
  city_code: string;
  room_basis: string;
  address?: string;
  leader: Leader;
  rooms: RoomType[];
  remarks: string;
  total_rooms: number;
  summary: Summary;
}

export function BookingConfirmation() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const fetchBookingData = useCallback(async () => {
    const formData = new URLSearchParams();

    try {

      formData.append('bookingCode', params.get("booking_code") || "");

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/bookingDetails`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });
      const data: BookingData = await response.json();
      console.log(data);
      setBookingData(data);
    } catch (error) {
      console.error("Error fetching booking data:", error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  const fetchBookingStatus = useCallback(async () => {
    const formData = new URLSearchParams();
    formData.append('bookingCode', params.get("booking_code") || "");
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/voucherRequest`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });
      const data = await response.json();
      console.log(data);

    } catch (error) {
      console.error("Error fetching booking data:", error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  React.useEffect(() => {
    fetchBookingData();
    fetchBookingStatus();
  }, [fetchBookingData, fetchBookingStatus]);

  // Format date function
  const formatDate = (dateString: string): string => {
    const options: Intl.DateTimeFormatOptions = { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Calculate total adults and children
  const calculateGuestTotals = (): { totalAdults: number; totalChildren: number } => {
    if (!bookingData?.rooms) return { totalAdults: 0, totalChildren: 0 };
    
    let totalAdults = 0;
    let totalChildren = 0;
    
    bookingData.rooms.forEach((roomType: RoomType) => {
      roomType.rooms.forEach((room: Room) => {
        totalAdults += room.total_adults;
        totalChildren += room.total_children;
      });
    });
    
    return { totalAdults, totalChildren };
  };

  // Get all guests grouped by room
  const getGuestsByRoom = (): { roomNumber: number; roomCategory: string; guests: string[] }[] => {
    if (!bookingData?.rooms) return [];
    
    const roomsWithGuests: { roomNumber: number; roomCategory: string; guests: string[] }[] = [];
    let roomCounter = 1;
    
    bookingData.rooms.forEach((roomType: RoomType) => {
      roomType.rooms.forEach((room: Room) => {
        const guests: string[] = [];
        
        // Add adults for this room
        room.adults.forEach((adult: Guest, adultIndex: number) => {
          const leaderBadge = (roomCounter === 1 && adultIndex === 0) ? ' (Leader)' : '';
          guests.push(`${adult.title} ${adult.first_name} ${adult.last_name}${leaderBadge}`);
        });

        // Add children for this room
        room.children.forEach((child: Child) => {
          guests.push(`${child.first_name} ${child.last_name} (Child, Age: ${child.child_age})`);
        });
        
        roomsWithGuests.push({
          roomNumber: roomCounter,
          roomCategory: room.category,
          guests: guests
        });
        
        roomCounter++;
      });
    });
    
    return roomsWithGuests;
  };

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white text-center">
        <div className="text-lg">Loading booking details...</div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="max-w-3xl mx-auto p-6 bg-white text-center">
        <div className="text-lg text-red-600">Failed to load booking details</div>
        <Link href={"/"}>
          <Button className="mt-4 bg-[#0000FF] hover:bg-blue-700 text-white">
            Back to Hotels home
          </Button>
        </Link>
      </div>
    );
  }

  const { totalAdults, totalChildren } = calculateGuestTotals();
  const guestsByRoom = getGuestsByRoom();
  const currentDate = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZoneName: 'short'
  } as Intl.DateTimeFormatOptions);

  // Calculate price per night safely
  const pricePerNight = bookingData.nights > 0 
    ? (parseFloat(bookingData.total_price) / bookingData.nights).toFixed(2)
    : '0.00';

  return (
    <div>
      <div className="h-52 bg-[#F8F9FA] mb-8 flex flex-col gap-12 p-6">
        <div className="max-w-lg mx-auto w-full flex items-center justify-between">
          <div className="flex items-center">
            <Lock className="w-4 h-4 text-[#808080]" />
            <span className="ml-2 text-xs text-[#808080] tracking-widest">
              Secure Transactions
            </span>
          </div>

          <div className="flex items-center">
            <Clock className="w-4 h-4 text-[#808080]" />
            <span className="ml-2 text-xs text-[#808080] tracking-widest">
              24-Hour Service{" "}
            </span>
          </div>

          <div className="flex items-center">
            <ShieldCheck className="w-4 h-4 text-[#808080]" />
            <span className="ml-2 text-xs text-[#808080] tracking-widest">
              Trusted Payments{" "}
            </span>
          </div>
        </div>
        <div className="max-w-xl w-full mx-auto flex items-center justify-between relative">
          <div className="h-[1px] w-4/5 flex justify-center left-8 bg-[#0000ff] absolute top-5 z-0"></div>
          <div className="flex items-center flex-col gap-2">
            <div className="w-10 h-10 bg-[#0000FF] z-10 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            <span className="ml-2 text-sm font-medium  text-[#0000FF]">
              Choose Room
            </span>
          </div>

          <div className="flex items-center flex-col gap-2">
            <div className="w-10 h-10 bg-[#0000FF] z-10 rounded-full flex items-center justify-center">
              <Check className="w-4 h-4 text-white" />
            </div>
            <span className="ml-2 text-sm font-medium text-[#0000FF]">
              Guest & Payment Details
            </span>
          </div>

          <div className="flex items-center flex-col gap-2">
            <div className="w-10 h-10 bg-[#0000FF] z-10 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">3</span>
            </div>
            <span className="ml-2 text-sm font-medium text-[#0000FF]">
              Booking confirmation
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto p-6 bg-white">
        {/* Confirmation Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-4 mb-2">
            <div>
              <CircleCheck className="w-16 h-16 mr-2 stroke-1  text-[#008000]" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-sm text-[#808080]">
                Confirmation Code #{bookingData.booking_code}
              </span>
              <h1 className="text-2xl font-semibold text-[#1A1A1A]">
                Booking {bookingData.booking_status === 'C' ? 'Confirmed' : bookingData.booking_status}
              </h1>
            </div>
          </div>
        </div>

        {/* Confirmation Image */}
        <div className="mb-8">
          <div className="relative w-full h-32 rounded-lg overflow-hidden">
            <Image
              src={"/bookingconformation.jpg"}
              alt="Booking confirmation"
              fill
              className="object-cover"
            />
          </div>
          <div className="text-center mt-4 space-y-2">
            <p className="text-sm text-[#666666] font-medium">
              Check your email for your order confirmation
            </p>
            <p className="text-sm text-[#666666]">
              Order Date: {currentDate}
            </p>
          </div>
        </div>

        {/* Hotel Information */}
        <Card className="mb-6 shadow-none border border-[#E6E6E6]">
          <CardContent className="p-6">
            <h2 className="text-xl md:text-2xl font-bold text-[#333333] mb-2">
              {bookingData.hotel_name}
            </h2>
            <div className="flex items-center text-sm text-[#808080] mb-2">
              <span className="">Hotel</span>
            </div>
            <div className="flex items-center text-sm text-[#808080] mb-8">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{bookingData.address || "Address not available"}</span>
            </div>

            {/* Room Information */}
            <div className="space-y-4">
              {bookingData.rooms.map((roomType: RoomType, roomTypeIndex: number) => (
                <div key={roomTypeIndex} className="space-y-3">
                  {roomType.rooms.map((room: Room, roomIndex: number) => (
                    <div key={roomIndex} className="border border-[#E6E6E6] rounded-lg p-4 bg-[#FAFBFC]">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-[#333333] text-lg">
                            Room {roomTypeIndex * roomType.rooms.length + roomIndex + 1}: {room.category}
                          </h3>
                          {roomType.type && (
                            <p className="text-sm text-[#666666] mt-1">Type: {roomType.type}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium text-[#333333]">
                            Room {roomTypeIndex * roomType.rooms.length + roomIndex + 1}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-[#666666]">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <CircleCheck className="w-4 h-4 mr-2 text-green-600" />
                            <span>Adults: {room.total_adults}</span>
                          </div>
                          {room.total_children > 0 && (
                            <div className="flex items-center">
                              <CircleCheck className="w-4 h-4 mr-2 text-green-600" />
                              <span>Children: {room.total_children}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <CircleCheck className="w-4 h-4 mr-2 text-green-600" />
                            <span>Basis: {bookingData.room_basis}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <CircleCheck className="w-4 h-4 mr-2 text-green-600" />
                            <span>Total Guests: {room.total_adults + room.total_children}</span>
                          </div>
                        </div>
                      </div>

                    </div>
                  ))}
                </div>
              ))}
            </div>

            {/* Booking Details */}
            <div className="grid grid-cols-5 gap-4 mt-6 p-6 rounded-lg bg-[#F8F9FA] border-gray-200">
              <div className="text-center w-full">
                <div className="text-sm font-medium text-[#333333]">
                  {formatDate(bookingData.check_in)}
                </div>
                <div className="text-xs text-[#808080]">Check-in</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-[#333333]">
                  {formatDate(bookingData.check_out)}
                </div>
                <div className="text-xs text-[#808080]">Check-out</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-[#333333]">
                  {bookingData.nights}
                </div>
                <div className="text-xs text-[#808080]">Nights</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-[#333333]">
                  {totalAdults}
                </div>
                <div className="text-xs text-[#808080]">Adults</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-medium text-[#333333]">
                  {bookingData.total_rooms}
                </div>
                <div className="text-xs text-[#808080]">Rooms</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Guest Information - Arranged by Rooms */}
        <Card className="mb-6 p-0 shadow-none border border-[#E6E6E6]">
          <CardContent className="p-6">
            <h3 className="font-medium text-[#4D4D4D] mb-4">Guest (s)</h3>
            <hr className="mb-4" />
            
            {guestsByRoom.map((roomGroup, roomIndex) => (
              <div key={roomIndex} className="mb-6 last:mb-0">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-[#333333] mb-1">
                    Room {roomGroup.roomNumber}: {roomGroup.roomCategory}
                  </div>
                  <div className="text-xs text-[#808080]">
                    {roomGroup.guests.length} guest(s)
                  </div>
                </div>
                
                <div className="space-y-3 ml-4">
                  {roomGroup.guests.map((guest: string, guestIndex: number) => (
                    <div key={guestIndex} className="space-y-1">
                      <div className="text-xs text-[#808080] tracking-wide">
                        Guest {guestIndex + 1}
                      </div>
                      <div className="font-medium text-[#333333]">{guest}</div>
                    </div>
                  ))}
                </div>
                
                {roomIndex < guestsByRoom.length - 1 && (
                  <hr className="my-4" />
                )}
              </div>
            ))}
            
            <hr className="my-4" />

            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-[#808080] uppercase tracking-wide mb-1">
                IMPORTANT NOTES
              </div>
              <p className="text-sm text-[#666666] whitespace-pre-line">
                <span dangerouslySetInnerHTML={{ __html: bookingData.remarks ?? "No additional remarks provided." }} />
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Pricing Breakdown */}
        <Card className="mb-6 p-0 shadow-none border border-[#E6E6E6]">
          <CardContent className="p-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Price per night</span>
                <span className="font-medium">
                  {bookingData.currency} {pricePerNight}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Adult(s)</span>
                <span className="font-medium">{totalAdults}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Children</span>
                <span className="font-medium">{totalChildren}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Number of nights</span>
                <span className="font-medium">{bookingData.nights}</span>
              </div>
              <hr className="my-3" />
              <div className="flex justify-between text-sm">
                <span className="text-[#666666]">Subtotal</span>
                <span className="font-medium">
                  {bookingData.currency} {bookingData.total_price}
                </span>
              </div>
              <hr className="my-3" />
              <div className="flex justify-between text-base font-medium text-[#4D4D4D]">
                <span>Total Charges</span>
                <span>{bookingData.currency} {bookingData.total_price}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Back Button */}
        <Link href={"/"}>
          <Button className="w-full bg-[#0000FF] hover:bg-blue-700 text-white py-6 text-sm font-medium">
            Back to Hotels home
          </Button>
        </Link>
      </div>
    </div>
  );
}
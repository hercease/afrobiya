"use client";

import Image from "next/image";
import {
  Check,
  MapPin,
  CircleCheck,
  Lock,
  Clock,
  ShieldCheck,
  Calendar,
  User,
  Home,
  Moon,
  Sun,
  CreditCard,
  ChevronLeft,
  FileText,
  Mail,
  Phone,
  AlertCircle,
  Coffee,
  DollarSign,
  Users,
  Dog,
  Baby,
  Key,
  Clock3,
  Luggage,
  Utensils,
  Wifi,
  Car,
  Droplets
} from "lucide-react";
import React, { useState, useCallback } from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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

// ==================== REMARK HELPER FUNCTIONS ====================

interface RemarkSection {
  type: string;
  title: string;
  icon: React.ReactNode;
  items: string[];
}

const decodeHtmlEntities = (text: string): string => {
  if (!text) return text;
  const textarea = document.createElement('textarea');
  textarea.innerHTML = text;
  return textarea.value;
};

const parseRemarks = (remarks: string): RemarkSection[] => {
  if (!remarks) return [];
  
  // Decode HTML entities first
  const decoded = decodeHtmlEntities(remarks);
  
  // Split by common delimiters
  const sections = decoded.split(/<br\s*\/?>|\n|<li>|<\/li>|<ul>|<\/ul>|<p>|<\/p>/i).filter(s => s.trim());
  
  const parsedSections: RemarkSection[] = [];
  let currentSection: { type: string | null, items: string[] } | null = null;
  
  // Define section types with their patterns
  const sectionPatterns = [
    { type: 'checkin', patterns: ['checkin', 'check-in', 'arrival'], icon: <Key className="h-4 w-4 text-blue-500" />, title: 'Check-in Information' },
    { type: 'checkout', patterns: ['checkout', 'check-out', 'departure'], icon: <Luggage className="h-4 w-4 text-orange-500" />, title: 'Check-out Information' },
    { type: 'fees', patterns: ['fee', 'charge', 'deposit', 'tax', 'cost'], icon: <DollarSign className="h-4 w-4 text-purple-500" />, title: 'Fees & Charges' },
    { type: 'payment', patterns: ['card', 'payment', 'cash', 'credit', 'debit'], icon: <CreditCard className="h-4 w-4 text-green-500" />, title: 'Payment Information' },
    { type: 'pets', patterns: ['pet', 'animal', 'dog', 'cat'], icon: <Dog className="h-4 w-4 text-amber-500" />, title: 'Pet Policy' },
    { type: 'age', patterns: ['minimum', 'age', 'years'], icon: <Baby className="h-4 w-4 text-indigo-500" />, title: 'Age Requirements' },
    { type: 'hours', patterns: ['hour', 'time', 'open', 'close'], icon: <Clock3 className="h-4 w-4 text-cyan-500" />, title: 'Operating Hours' },
    { type: 'dining', patterns: ['breakfast', 'lunch', 'dinner', 'meal', 'restaurant'], icon: <Utensils className="h-4 w-4 text-rose-500" />, title: 'Dining Information' },
    { type: 'amenities', patterns: ['wifi', 'internet', 'parking', 'pool', 'spa', 'gym'], icon: <Wifi className="h-4 w-4 text-teal-500" />, title: 'Amenities' },
    { type: 'transport', patterns: ['shuttle', 'transport', 'airport', 'taxi'], icon: <Car className="h-4 w-4 text-slate-500" />, title: 'Transportation' },
  ];

  for (const section of sections) {
    const cleanSection = section.replace(/<[^>]+>/g, '').trim();
    if (!cleanSection || cleanSection.length < 3) continue;
    
    // Determine section type
    let detectedType = 'general';
    const lowerSection = cleanSection.toLowerCase();
    
    for (const pattern of sectionPatterns) {
      if (pattern.patterns.some(p => lowerSection.includes(p))) {
        detectedType = pattern.type;
        break;
      }
    }
    
    // If it's the same as current section, add to it
    if (currentSection?.type === detectedType) {
      currentSection.items.push(cleanSection);
    } else {
      // Save previous section
      if (currentSection) {
        const pattern = sectionPatterns.find(p => p.type === currentSection?.type) || 
          { type: 'general', icon: <FileText className="h-4 w-4 text-gray-400" />, title: 'Additional Information' };
        
        parsedSections.push({
          type: currentSection.type,
          title: pattern.title,
          icon: pattern.icon,
          items: currentSection.items
        });
      }
      
      // Start new section
      currentSection = { type: detectedType, items: [cleanSection] };
    }
  }
  
  // Add the last section
  if (currentSection) {
    const pattern = sectionPatterns.find(p => p.type === currentSection.type) || 
      { type: 'general', icon: <FileText className="h-4 w-4 text-gray-400" />, title: 'Additional Information' };
    
    parsedSections.push({
      type: currentSection.type,
      title: pattern.title,
      icon: pattern.icon,
      items: currentSection.items
    });
  }
  
  return parsedSections;
};

const extractStructuredInfo = (remarks: string) => {
  if (!remarks) return null;
  
  const decoded = decodeHtmlEntities(remarks);
  const info: Record<string, any> = {};
  
  // Extract check-in/out times
  const checkInMatch = decoded.match(/CheckIn Time-Begin:?\s*([^<\n]+)/i);
  const checkInEndMatch = decoded.match(/CheckIn Time-End:?\s*([^<\n]+)/i);
  const checkOutMatch = decoded.match(/CheckOut Time:?\s*([^<\n]+)/i);
  
  if (checkInMatch || checkInEndMatch || checkOutMatch) {
    info.timing = {
      checkIn: checkInMatch?.[1]?.trim(),
      checkInEnd: checkInEndMatch?.[1]?.trim(),
      checkOut: checkOutMatch?.[1]?.trim()
    };
  }
  
  // Extract minimum age
  const ageMatch = decoded.match(/Minimum CheckIn Age:?\s*(\d+)/i);
  if (ageMatch) {
    info.minAge = ageMatch[1];
  }
  
  // Extract fees as structured list
  const feeSection = decoded.match(/Optional Fees:?\s*([^]*?)(?=<|$)/i);
  if (feeSection) {
    const fees = feeSection[1]
      .replace(/<[^>]*>/g, '')
      .split(/[•\n]/)
      .map(f => f.trim())
      .filter(f => f && f.length > 5);
    
    if (fees.length > 0) {
      info.fees = fees;
    }
  }
  
  // Extract payment methods
  const paymentMatch = decoded.match(/Cards Accepted:?\s*([^<\n]+)/i);
  if (paymentMatch) {
    info.paymentMethods = paymentMatch[1].split(',').map(c => c.trim());
  }
  
  return info;
};

// ==================== MAIN COMPONENT ====================

export function BookingConfirmation() {
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const router = useRouter();
  const params = useSearchParams();

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
      day: 'numeric' 
    };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  const formatFullDate = (dateString: string): string => {
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
  const getGuestsByRoom = (): { roomNumber: number; roomCategory: string; guests: { name: string; isLeader: boolean; age?: string }[] }[] => {
    if (!bookingData?.rooms) return [];
    
    const roomsWithGuests: { roomNumber: number; roomCategory: string; guests: { name: string; isLeader: boolean; age?: string }[] }[] = [];
    let roomCounter = 1;
    
    bookingData.rooms.forEach((roomType: RoomType) => {
      roomType.rooms.forEach((room: Room) => {
        const guests: { name: string; isLeader: boolean; age?: string }[] = [];
        
        // Add adults for this room
        room.adults.forEach((adult: Guest, adultIndex: number) => {
          const isLeader = (roomCounter === 1 && adultIndex === 0);
          guests.push({
            name: `${adult.title} ${adult.first_name} ${adult.last_name}`,
            isLeader: isLeader
          });
        });

        // Add children for this room
        room.children.forEach((child: Child) => {
          guests.push({
            name: `${child.first_name} ${child.last_name}`,
            isLeader: false,
            age: child.child_age
          });
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

  const toggleSection = (sectionType: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionType) 
        ? prev.filter(s => s !== sectionType)
        : [...prev, sectionType]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="bg-white/80 backdrop-blur-sm p-8 rounded-2xl shadow-xl">
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-600 border-t-transparent mx-auto"></div>
          <p className="text-sm text-gray-600 mt-4 font-medium">Loading your booking details...</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-8 max-w-md text-center shadow-xl">
          <div className="bg-red-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="h-10 w-10 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold text-gray-800 mb-2">Booking Not Found</h2>
          <p className="text-sm text-gray-600 mb-6">We couldn't find your booking details. Please try again.</p>
          <Link href={"/"}>
            <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-full px-8">
              Return to Home
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const { totalAdults, totalChildren } = calculateGuestTotals();
  const guestsByRoom = getGuestsByRoom();
  const currentDate = new Date().toLocaleDateString('en-US', { 
    month: 'long', 
    day: 'numeric', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  // Calculate price per night safely
  const pricePerNight = bookingData.nights > 0 
    ? (parseFloat(bookingData.total_price) / bookingData.nights).toFixed(2)
    : '0.00';

  // Parse remarks for display
  const remarkSections = parseRemarks(bookingData.remarks);
  const structuredInfo = extractStructuredInfo(bookingData.remarks);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30">
      {/* Compact Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b sticky top-0 z-10 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/')}
              className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="text-sm">Back to Hotels</span>
            </Button>

            {/* Trust Badges - Compact */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1 text-gray-500">
                <Lock className="h-3 w-3" />
                <span className="text-xs hidden sm:inline">Secure</span>
              </div>
              <div className="flex items-center gap-1 text-gray-500">
                <ShieldCheck className="h-3 w-3" />
                <span className="text-xs hidden sm:inline">Protected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4">
        {/* Success Banner */}
        <div className="bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl p-4 mb-5 flex items-center gap-3 shadow-sm">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-full p-1.5 shadow-md">
            <Check className="h-4 w-4 text-white" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800">
              Booking Confirmed! <span className="font-bold">#{bookingData.booking_code}</span>
            </p>
          </div>
          <div className="text-xs text-emerald-700 bg-white/80 px-3 py-1 rounded-full shadow-sm">
            {currentDate}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Left Column - Hotel & Guest Info (2/3 width) */}
          <div className="lg:col-span-2 space-y-5">
            {/* Hotel Card - Compact */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="font-bold text-xl text-gray-800">{bookingData.hotel_name}</h1>
                  <div className="flex items-center gap-1 text-xs text-gray-500 mt-1.5">
                    <MapPin className="h-3.5 w-3.5 text-gray-400" />
                    <span>{bookingData.address || "Address not available"}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-gray-500">Booking ID</div>
                  <div className="text-sm font-mono bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-full text-blue-700 font-semibold">
                    #{bookingData.booking_code}
                  </div>
                </div>
              </div>

              {/* Stay Details - Compact Grid */}
              <div className="grid grid-cols-5 gap-2 mt-5 text-center text-xs">
                <div className="bg-gradient-to-b from-gray-50 to-white p-2.5 rounded-lg border border-gray-100">
                  <Calendar className="h-3.5 w-3.5 mx-auto text-blue-500" />
                  <div className="font-medium mt-1 text-gray-800">{formatDate(bookingData.check_in)}</div>
                  <div className="text-gray-500 text-[10px]">Check-in</div>
                </div>
                <div className="bg-gradient-to-b from-gray-50 to-white p-2.5 rounded-lg border border-gray-100">
                  <Calendar className="h-3.5 w-3.5 mx-auto text-orange-500" />
                  <div className="font-medium mt-1 text-gray-800">{formatDate(bookingData.check_out)}</div>
                  <div className="text-gray-500 text-[10px]">Check-out</div>
                </div>
                <div className="bg-gradient-to-b from-gray-50 to-white p-2.5 rounded-lg border border-gray-100">
                  <Moon className="h-3.5 w-3.5 mx-auto text-indigo-500" />
                  <div className="font-medium mt-1 text-gray-800">{bookingData.nights}</div>
                  <div className="text-gray-500 text-[10px]">Nights</div>
                </div>
                <div className="bg-gradient-to-b from-gray-50 to-white p-2.5 rounded-lg border border-gray-100">
                  <User className="h-3.5 w-3.5 mx-auto text-green-500" />
                  <div className="font-medium mt-1 text-gray-800">{totalAdults}</div>
                  <div className="text-gray-500 text-[10px]">Adults</div>
                </div>
                <div className="bg-gradient-to-b from-gray-50 to-white p-2.5 rounded-lg border border-gray-100">
                  <Home className="h-3.5 w-3.5 mx-auto text-purple-500" />
                  <div className="font-medium mt-1 text-gray-800">{bookingData.total_rooms}</div>
                  <div className="text-gray-500 text-[10px]">Rooms</div>
                </div>
              </div>

              {/* Room Details - Compact Cards */}
              <div className="mt-5 space-y-3">
                {bookingData.rooms.map((roomType: RoomType, typeIndex: number) => (
                  <div key={typeIndex}>
                    {roomType.rooms.map((room: Room, roomIndex: number) => (
                      <div key={roomIndex} className="border border-gray-200 rounded-lg p-3 bg-gradient-to-r from-gray-50/50 to-white hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-center mb-2">
                          <div className="flex items-center gap-2">
                            <div className="bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-xs font-medium px-2.5 py-1 rounded-full shadow-sm">
                              Room {typeIndex * roomType.rooms.length + roomIndex + 1}
                            </div>
                            <span className="text-sm font-medium text-gray-700">{room.category}</span>
                          </div>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                            {room.total_adults} Adult · {room.total_children} Child
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <span className="font-medium">Basis:</span> {bookingData.room_basis}
                        </p>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Guest Information - Compact by Room */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="text-sm font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Users className="h-4 w-4 text-blue-500" />
                Guest Information
              </h3>
              
              <div className="space-y-4">
                {guestsByRoom.map((roomGroup, roomIndex) => (
                  <div key={roomIndex} className="border-b border-gray-100 last:border-0 pb-4 last:pb-0">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                        Room {roomGroup.roomNumber} · {roomGroup.roomCategory}
                      </span>
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">
                        {roomGroup.guests.length} guest(s)
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {roomGroup.guests.map((guest, guestIndex) => (
                        <div key={guestIndex} className="flex items-start gap-2 text-sm bg-gray-50 p-2 rounded-lg">
                          <div className="mt-0.5">
                            {guest.isLeader ? (
                              <span className="text-xs bg-gradient-to-r from-green-500 to-emerald-500 text-white px-2 py-0.5 rounded-full">Lead</span>
                            ) : (
                              <span className="text-xs text-gray-400 w-4 inline-block text-center">•</span>
                            )}
                          </div>
                          <div className="flex-1">
                            <span className="text-gray-800 font-medium">{guest.name}</span>
                            {guest.age && (
                              <span className="text-xs text-gray-500 ml-1">(Age: {guest.age})</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Remarks Section - Beautifully Formatted */}
              {bookingData.remarks && remarkSections.length > 0 && (
                <div className="mt-5 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-indigo-500" />
                    Hotel Policies & Important Information
                  </h4>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {remarkSections.map((section, idx) => (
                      <div 
                        key={idx} 
                        className="bg-gradient-to-br from-white to-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all hover:border-indigo-200"
                      >
                        <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-100">
                          <div className="p-1.5 bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg">
                            {section.icon}
                          </div>
                          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                            {section.title}
                          </span>
                        </div>
                        
                        {section.items.length === 1 ? (
                          <p className="text-xs text-gray-600 leading-relaxed">{section.items[0]}</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {section.items.map((item, itemIdx) => (
                              <li key={itemIdx} className="text-xs text-gray-600 flex items-start gap-2">
                                <span className="text-indigo-400 mt-1 text-sm">•</span>
                                <span className="leading-relaxed flex-1">{item}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Info Row from Structured Data */}
              {structuredInfo && (
                <div className="mt-4 flex flex-wrap gap-2 pt-3">
                  {structuredInfo.timing?.checkIn && (
                    <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full flex items-center gap-1">
                      <Key className="h-3 w-3" />
                      Check-in: {structuredInfo.timing.checkIn}
                    </div>
                  )}
                  {structuredInfo.timing?.checkOut && (
                    <div className="text-xs bg-orange-50 text-orange-700 px-3 py-1.5 rounded-full flex items-center gap-1">
                      <Luggage className="h-3 w-3" />
                      Check-out: {structuredInfo.timing.checkOut}
                    </div>
                  )}
                  {structuredInfo.minAge && (
                    <div className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full flex items-center gap-1">
                      <Baby className="h-3 w-3" />
                      Min. Age: {structuredInfo.minAge}+
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Price Summary & Actions (1/3 width) */}
          <div className="space-y-5">
            {/* Price Summary Card */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 sticky top-20 shadow-sm hover:shadow-md transition-shadow">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-green-500" />
                Price Summary
              </h3>
              
              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600 pb-2 border-b border-gray-100">
                  <span>Price per night</span>
                  <span className="font-medium text-gray-800">{bookingData.currency} {pricePerNight}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Adults ({totalAdults})</span>
                  <span className="text-green-600">Included</span>
                </div>
                {totalChildren > 0 && (
                  <div className="flex justify-between text-gray-600">
                    <span>Children ({totalChildren})</span>
                    <span className="text-green-600">Included</span>
                  </div>
                )}
                <div className="flex justify-between text-gray-600">
                  <span>Nights</span>
                  <span className="font-medium text-gray-800">{bookingData.nights}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 mt-3">
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                      {bookingData.currency} {bookingData.total_price}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 text-right">Includes all taxes & fees</p>
                </div>
              </div>

              {/* Cancellation Info */}
              {bookingData.cancellation_deadline && (
                <div className="mt-5 pt-4 border-t border-gray-200">
                  <div className="flex items-start gap-2 text-xs text-emerald-700 bg-gradient-to-r from-emerald-50 to-green-50 p-3 rounded-xl border border-emerald-100">
                    <Calendar className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>
                      <span className="font-semibold">Free cancellation</span> before {formatFullDate(bookingData.cancellation_deadline)}
                    </span>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-5 space-y-2">
                <Button 
                  variant="outline"
                  className="w-full h-11 text-sm rounded-xl border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all"
                  onClick={() => router.push('/')}
                >
                  Browse More Hotels
                </Button>
              </div>
            </div>

            {/* Need Help Card */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl border border-indigo-100 p-5 shadow-sm">
              <h4 className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <span className="text-lg">🛟</span>
                Need Help?
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center gap-2 text-indigo-700 bg-white/60 p-2 rounded-lg">
                  <Mail className="h-3.5 w-3.5" />
                  <span>support@travelhub.com</span>
                </div>
                <div className="flex items-center gap-2 text-indigo-700 bg-white/60 p-2 rounded-lg">
                  <Phone className="h-3.5 w-3.5" />
                  <span>+1 (800) 123-4567</span>
                </div>
              </div>
              <div className="mt-3 pt-2 border-t border-indigo-200">
                <p className="text-xs text-indigo-600">
                  Quote booking code: <span className="font-mono font-bold bg-indigo-100 px-2 py-0.5 rounded">{bookingData.booking_code}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
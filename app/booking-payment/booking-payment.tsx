"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Info, ChevronLeft, Check, Lock, Clock, ShieldCheck, Star, ConstructionIcon } from "lucide-react";
import { useForm } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import HotelPoliciesDialog from "@/components/hotel-info-dilaog";
import { getCachedBookingData, clearBookingCache } from '@/components/bookingCache';
import { getFacilityIcon } from '@/components/facilities-icons';

// Define form types
interface GuestForm {
  rooms: {
    adults: {
      title: string;
      firstName: string;
      lastName: string;
    }[];
    children: {
      title: string;
      firstName: string;
      lastName: string;
      age: string;
    }[];
  }[];
  options: {
    lateArrivalHours: string;
    lateArrivalMinutes: string;
    connectingRooms: boolean;
    adjoiningRooms: boolean;
    nonSmoking: boolean;
    honeymoon: boolean;
    extraBed: boolean;
  };
  notes: string;
  terms: boolean;
}

interface PriceBreakdown {
  from_date: string;
  to_date: string;
  price: number;
  currency: string;
}

export function BookingDetails() {
  const [isPoliciesDialogOpen, setIsPoliciesDialogOpen] = useState(false);
  const [bookingData, setBookingData] = useState<{hotel: any; room: any;}>({hotel: null, room: null});
  const [breakdownData, setBreakdownData] = useState<PriceBreakdown[]>([]);
  const [evaluationData, setEvaluationData] = useState<any[]>([]);
  const [roomForms, setRoomForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  // Initialize React Hook Form
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
    watch,
    setValue
  } = useForm<GuestForm>({
    defaultValues: {
      rooms: [],
      options: {
        lateArrivalHours: "",
        lateArrivalMinutes: "",
        connectingRooms: false,
        adjoiningRooms: false,
        nonSmoking: false,
        honeymoon: false,
        extraBed: false
      }
    }
  });

  // Get URL parameters
  const totalRooms = parseInt(params.get("totalRooms") || "1");
  const checkInDate = params.get("checkInDate") || "";
  const checkOutDate = params.get("checkOutDate") || "";

  // Calculate total guests and initialize forms by room
  useEffect(() => {
    const roomFormsData = [];
    let totalAdults = 0;
    let totalChildren = 0;
    
    for (let i = 1; i <= totalRooms; i++) {
      const adults = parseInt(params.get(`adult${i}`) || "1");
      const children = parseInt(params.get(`children${i}`) || "0");
      const childrenAges = params.get(`childrenAges${i}`) || "";
      
      const adultForms = [];
      const childrenForms = [];
      
      // Create form entries for each adult in the room
      for (let j = 1; j <= adults; j++) {
        adultForms.push({
          title: "mr",
          firstName: "",
          lastName: ""
        });
        totalAdults++;
      }
      
      // Create form entries for each child in the room
      const childAgesArray = childrenAges.split(',').filter(age => age.trim() !== '');
      for (let k = 1; k <= children; k++) {
        const age = childAgesArray[k - 1] || "";
        childrenForms.push({
          title: "child",
          firstName: "",
          lastName: "",
          age: age
        });
        totalChildren++;
      }
      
      roomFormsData.push({
        adults: adultForms,
        children: childrenForms
      });
    }
    
    setRoomForms(roomFormsData);
    
    // Initialize form values
    roomFormsData.forEach((room, roomIndex) => {
      room.adults.forEach((adult, adultIndex) => {
        setValue(`rooms.${roomIndex}.adults.${adultIndex}`, adult);
      });
      room.children.forEach((child, childIndex) => {
        setValue(`rooms.${roomIndex}.children.${childIndex}`, child);
      });
    });
  }, [totalRooms, params, setValue]);

  // Form submission handler
  const onSubmit = async (data: GuestForm) => {
    console.log("Form data:", data);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      router.push("/booking-confirmation");
    } catch (error) {
      console.error("Booking failed:", error);
    }
  };

  // Calculate nights between dates
  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights();

  // Fetch hotel information and price breakdown
  const fetchHotelInformation = useCallback(async () => {
    setLoading(true);
    const hotelSearchCode = params.get("hotelSearchCode") || "";
    const checkInDate = params.get("checkInDate") || "";
    const hotelCode = params.get("hotelCode") || "";

    try {
      const [evaluationResponse, priceResponse] = await Promise.all([
        // bookingEvaluation request
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/bookingEvaluation`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            hotelSearchCode,
            checkIn: checkInDate,
            hotelCode
          }).toString(),
        }),
        
        // price_breakdown request
        fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/priceBreakdown`, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            hotelSearchCode,
            checkIn: checkInDate,
            hotelCode
          }).toString(),
        })
      ]);

      const evaluationData = await evaluationResponse.json();
      const priceData = await priceResponse.json();

      console.log("Booking Evaluation Data:", evaluationData);
      console.log("Price Breakdown Data:", priceData);
      
      // Set booking data
      if (evaluationData) {
        setEvaluationData(evaluationData);
      }
      
      // Set price breakdown data
      if (priceData && priceData.price_breakdown) {
        setBreakdownData(priceData.price_breakdown);
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => {
    fetchHotelInformation();
  }, [fetchHotelInformation]);

  useEffect(() => {
    const cached = getCachedBookingData();
    if (cached) {
      setBookingData(cached);
    }
  }, []);

  // Calculate pricing from breakdown data
  const calculatePricing = () => {
    if (!breakdownData || breakdownData.length === 0) {
      return {
        subtotal: 0,
        taxes: 0,
        total: 0,
        currency: 'USD',
        nights: nights
      };
    }

    const subtotal = breakdownData.reduce((sum, item) => sum + item.price, 0);
    const taxes = bookingData?.room?.TotalPrice - subtotal || 0; // Assuming 10% taxes
    const total = subtotal + taxes;
    const currency = breakdownData[0]?.currency || 'USD';

    return {
      subtotal,
      taxes,
      total,
      currency,
      nights: breakdownData.length
    };
  };

  const pricing = calculatePricing();

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
      const facilitiesToDisplay = maxFacilities 
        ? facilities.slice(0, maxFacilities)
        : facilities;
  
      return (
        <div className="flex flex-wrap gap-2">
          {facilitiesToDisplay.map((facility, index) => {
            const IconComponent = getFacilityIcon(facility);
            return (
              <div
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 text-gray-700 text-xs border border-gray-200 hover:bg-gray-200 transition-colors"
              >
                <IconComponent className="h-3 w-3 flex-shrink-0" />
                <span className="whitespace-nowrap">{facility}</span>
              </div>
            );
          })}
        </div>
      );
    }

  const handlePoliciesClick = () => {
    setIsPoliciesDialogOpen(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Format currency
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  };

  // Calculate total guests for display
  const calculateTotalGuests = () => {
    let totalAdults = 0;
    let totalChildren = 0;
    
    roomForms.forEach(room => {
      totalAdults += room.adults.length;
      totalChildren += room.children.length;
    });
    
    return { totalAdults, totalChildren };
  };

  console.log(bookingData?.room?.TotalPrice)

  const { totalAdults, totalChildren } = calculateTotalGuests();

  return (
    <>
      <div className="min-h-screen">
        <div className="h-60 md:h-52 bg-[#F8F9FA] mb-8 flex flex-col gap-12 p-6 relative">
          <div className="sm:mt-0 mt-12 max-w-lg mx-auto w-full flex items-center justify-between">
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
            <div className="h-[1px] w-2/5 flex justify-center left-8 bg-[#0000ff] absolute top-5 z-0"></div>
            <div className="h-[1px] w-2/5 flex justify-center right-16 bg-[#666] absolute top-5 z-0"></div>
            <div className="flex items-center flex-col gap-2">
              <div className="w-10 h-10 bg-[#0000FF] z-10 rounded-full flex items-center justify-center">
                <Check className="w-4 h-4 text-white" />
              </div>
              <span className="ml-2 text-xs md:text-sm font-medium text-[#0000FF]">
                Choose Room
              </span>
            </div>

            <div className="flex items-center flex-col gap-2">
              <div className="w-10 h-10 bg-[#0000FF] z-10 rounded-full flex items-center justify-center">
                <span className="text-white text-sm font-medium">2</span>
              </div>
              <span className="ml-2 text-xs md:text-sm font-medium text-[#0000FF]">
                Guest & Payment Details
              </span>
            </div>

            <div className="flex items-center flex-col gap-2">
              <div className="w-10 h-10 border border-[#666666] bg-[#F8F9FA] z-10 rounded-full flex items-center justify-center">
                <span className="text-[#666666] text-sm font-semibold">3</span>
              </div>
              <span className="ml-2 text-xs md:text-sm font-medium text-[#666666]">
                Booking confirmation
              </span>
            </div>
          </div>

          <div className="absolute left-[8%]">
            <Button
              size={"icon"}
              onClick={() => router.back()}
              className="border border-[#CCCCCC] hover:bg-white/90 bg-white"
            >
              <ChevronLeft className="h-4 w-4 text-[#666]" />
            </Button>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full p-4">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-3 space-y-6">
              <div>
                <h1 className="text-sm md:text-base font-medium text-[#4D4D4D]">
                  Almost done! Enter your details and complete your booking now.
                </h1>
              </div>

              {/* Hotel Information */}
              <div className="border-[#ccc] border rounded-lg">
                <div className="py-6 space-y-6">
                  <div className="flex flex-col gap-2 px-6">
                    <h2 className="text-xl md:text-3xl font-semibold text-[#333333]">
                      {bookingData?.room?.hotelName || "Hotel Name"}
                    </h2>
                    <StarRating rating={Number(bookingData?.hotel?.hotelInfo?.category) || 0} />
                    <div className="flex items-center gap-2 text-sm text-[#666666]">
                      <svg
                        className="w-4 h-4"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {bookingData?.room?.hotelAddress || "Hotel Address"}
                    </div>
                  </div>

                  <hr />

                  {/* Room Details */}
                  <div className="flex gap-4 px-6">
                    <div className="relative w-24 h-20 rounded-lg overflow-hidden">
                      <Image
                        src="/placeholder.svg?height=80&width=96"
                        alt="Room"
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-medium text-[#333333] mb-2">
                        {bookingData?.room?.Rooms?.[0] || "Room Type"}
                      </h3>
                      <div className="space-y-1 text-sm text-[#808080]">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          {bookingData?.room?.Special || "Room Special"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Booking Dates */}
                  <div className="grid grid-cols-5 gap-4 text-center px-6">
                    <div>
                      <p className="text-xs md:text-sm font-medium text-[#333333]">
                        {formatDate(checkInDate)}
                      </p>
                      <p className="text-xs text-[#808080]">Check-in</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium text-[#333333]">
                        {formatDate(checkOutDate)}
                      </p>
                      <p className="text-xs text-[#808080]">Check-out</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium text-[#333333]">
                        {pricing.nights}
                      </p>
                      <p className="text-xs text-[#808080]">Nights</p>
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-medium text-[#333333]">
                        {totalAdults}
                      </p>
                      <p className="text-xs text-[#808080]">Adult (s)</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[#333333]">{totalRooms}</p>
                      <p className="text-xs text-[#808080]">Room (s)</p>
                    </div>
                  </div>
                </div>

                <hr />

                {/* Room Features and Facilities */}
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-medium text-[#4D4D4D] mb-4">
                    Room Features and Facilities
                  </h3>
                  <div className="grid grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-1 text-xs md:text-[13px] text-[#666666]">
                    {bookingData?.hotel?.RoomFacilities?.length > 0 && (
                      <FacilityList facilities={bookingData.hotel.RoomFacilities} />
                    )}
                  </div>
                </div>

                <hr />

                {/* Remarks */}
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-medium text-[#4D4D4D] mb-4">
                    Remarks
                  </h3>
                  <p className="text-sm text-[#666666]">
                    {evaluationData?.remarks && <span dangerouslySetInnerHTML={{ __html: evaluationData?.remarks?.[0] || "No remarks" }} /> }
                  </p>
                </div>
              </div>

              {/* Guest Information Form */}
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="rounded-lg border border-[#ccc] py-6">
                  <div className="px-6">
                    <h3 className="text-lg font-medium text-[#333333] mb-4">
                      Guest Details - {totalRooms} Room(s), {totalAdults} Adult(s), {totalChildren} Child(ren)
                    </h3>
                    <div className="flex items-start gap-2 mb-6 p-3 rounded-lg">
                      <Info className="w-4 h-4 text-blue-600 mt-0.5" />
                      <p className="text-sm text-gray-700">
                        The guest checking into each hotel room must be 21 or older, present a valid Photo ID and credit card.
                      </p>
                    </div>
                  </div>
                  <hr />
                  
                  {/* Room-wise Guest Forms */}
                  {roomForms.map((room, roomIndex) => (
                    <div key={roomIndex} className="p-6 border-b border-gray-200 last:border-b-0">
                      {/* Room Header */}
                      <div className="mb-6">
                        <h4 className="text-lg font-semibold text-[#333333] mb-2">
                          Room {roomIndex + 1}
                        </h4>
                        <p className="text-sm text-[#666666]">
                          {room.adults.length} Adult(s), {room.children.length} Child(ren)
                        </p>
                      </div>

                      {/* Adults in this Room */}
                      {room.adults.length > 0 && (
                        <div className="mb-6">
                          <h5 className="text-sm font-medium text-[#808080] mb-4 tracking-widest">
                            ADULTS
                          </h5>
                          <div className="space-y-4">
                            {room.adults.map((_, adultIndex:number) => (
                              <div key={adultIndex} className="p-4 border border-gray-200 rounded-lg">
                                <h6 className="text-sm font-medium text-gray-700 mb-3">Adult {adultIndex + 1}</h6>
                                <div className="grid md:grid-cols-12 gap-4">
                                  <div className="col-span-2">
                                    <Label className="text-sm font-medium text-gray-700">
                                      Title *
                                    </Label>
                                    <Select 
                                      onValueChange={(value) => setValue(`rooms.${roomIndex}.adults.${adultIndex}.title`, value)}
                                      defaultValue="mr"
                                    >
                                      <SelectTrigger className="mt-1 w-full h-12">
                                        <SelectValue placeholder="Mr." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="mr">Mr.</SelectItem>
                                        <SelectItem value="mrs">Mrs.</SelectItem>
                                        <SelectItem value="ms">Ms.</SelectItem>
                                        <SelectItem value="dr">Dr.</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="col-span-5">
                                    <Label className="text-sm font-medium text-gray-700">
                                      First name *
                                    </Label>
                                    <Input
                                      placeholder="Enter first name"
                                      className="mt-1 h-12"
                                      {...register(`rooms.${roomIndex}.adults.${adultIndex}.firstName`, { 
                                        required: "First name is required",
                                        minLength: { value: 2, message: "First name must be at least 2 characters" }
                                      })}
                                    />
                                  </div>
                                  
                                  <div className="col-span-5">
                                    <Label className="text-sm font-medium text-gray-700">
                                      Last name *
                                    </Label>
                                    <Input
                                      placeholder="Enter last name"
                                      className="mt-1 h-12"
                                      {...register(`rooms.${roomIndex}.adults.${adultIndex}.lastName`, { 
                                        required: "Last name is required",
                                        minLength: { value: 2, message: "Last name must be at least 2 characters" }
                                      })}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Children in this Room */}
                      {room.children.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-[#808080] mb-4 tracking-widest">
                            CHILDREN
                          </h5>
                          <div className="space-y-4">
                            {room.children.map((child : any, childIndex: number) => (
                              <div key={childIndex} className="p-4 border border-gray-200 rounded-lg">
                                <h6 className="text-sm font-medium text-gray-700 mb-3">
                                  Child {childIndex + 1} {child.age && `- Age: ${child.age}`}
                                </h6>
                                <div className="grid md:grid-cols-12 gap-4">
                                  <div className="col-span-2">
                                    <Label className="text-sm font-medium text-gray-700">
                                      Title
                                    </Label>
                                    <Select 
                                      onValueChange={(value) => setValue(`rooms.${roomIndex}.children.${childIndex}.title`, value)}
                                      defaultValue="child"
                                    >
                                      <SelectTrigger className="mt-1 w-full h-12">
                                        <SelectValue placeholder="Child" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="child">Child</SelectItem>
                                        <SelectItem value="master">Master</SelectItem>
                                        <SelectItem value="miss">Miss</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  
                                  <div className="col-span-3">
                                    <Label className="text-sm font-medium text-gray-700">
                                      First name *
                                    </Label>
                                    <Input
                                      placeholder="Enter first name"
                                      className="mt-1 h-12"
                                      {...register(`rooms.${roomIndex}.children.${childIndex}.firstName`, { 
                                        required: "First name is required",
                                        minLength: { value: 2, message: "First name must be at least 2 characters" }
                                      })}
                                    />
                                  </div>
                                  
                                  <div className="col-span-3">
                                    <Label className="text-sm font-medium text-gray-700">
                                      Last name *
                                    </Label>
                                    <Input
                                      placeholder="Enter last name"
                                      className="mt-1 h-12"
                                      {...register(`rooms.${roomIndex}.children.${childIndex}.lastName`, { 
                                        required: "Last name is required",
                                        minLength: { value: 2, message: "Last name must be at least 2 characters" }
                                      })}
                                    />
                                  </div>
                                  
                                  <div className="col-span-4">
                                    <Label className="text-sm font-medium text-gray-700">
                                      Age *
                                    </Label>
                                    <Input
                                      value={child.age}
                                      disabled
                                      className="mt-1 h-12 bg-gray-100"
                                      placeholder="Age (auto-filled)"
                                      {...register(`rooms.${roomIndex}.children.${childIndex}.age`)}
                                    />
                                    <p className="text-xs text-gray-500 mt-1">
                                      Age is pre-filled from your selection and cannot be changed
                                    </p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <hr />

                  {/* Options Section */}
                  <div className="p-6">
                    <h4 className="text-sm font-medium text-[#808080] mb-4 tracking-widest">
                      OPTIONS
                    </h4>
                    <div className="space-y-4">
                      <div className="flex md:items-center flex-col md:flex-row gap-4">
                        <span className="text-sm text-gray-700">
                          Please note late arrival at:
                        </span>
                        <div className="flex items-center gap-2">
                          <Input
                            placeholder="00"
                            className="w-16 text-center"
                            {...register("options.lateArrivalHours")}
                          />
                          <span className="text-sm text-[#808080]">Hours</span>
                          <Input
                            placeholder="00"
                            className="w-16 text-center"
                            {...register("options.lateArrivalMinutes")}
                          />
                          <span className="text-sm text-[#808080]">Minutes</span>
                        </div>
                      </div>

                      <div className="space-y-3">
                        {[
                          { id: "connecting", label: "If possible, provide connecting rooms", name: "connectingRooms" },
                          { id: "adjoining", label: "If possible, provide adjoining rooms", name: "adjoiningRooms" },
                          { id: "nonsmoking", label: "If possible, provide non-smoking room", name: "nonSmoking" },
                          { id: "honeymoon", label: "Kindly request special treatment as the booking is for Honeymooners", name: "honeymoon" },
                          { id: "extrabed", label: "Request for an extra bed", name: "extraBed" }
                        ].map((option) => (
                          <div key={option.id} className="flex items-center gap-4">
                            <Checkbox
                              id={option.id}
                              {...register(`options.${option.name}` as any)}
                            />
                            <Label
                              htmlFor={option.id}
                              className="text-sm text-gray-700"
                            >
                              {option.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Notes */}
                  <div className="mt-6 p-6">
                    <Label htmlFor="notes" className="text-sm font-medium text-gray-700">
                      Note (Optional)
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Write some notes for your reservation"
                      className="mt-1 min-h-[80px]"
                      {...register("notes")}
                    />
                  </div>
                </div>

                {/* Terms and Book button */}
                <div className="border border-[#ccc] rounded-lg p-6 mt-6">
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <Checkbox 
                        id="terms"
                        {...register("terms", { required: "You must agree to the terms and conditions" })}
                      />
                      <Label htmlFor="terms" className="text-sm text-[#808080] text-center">
                        I agree to the{" "}
                        <button type="button" className="text-[#FC5D01] hover:text-orange-600 underline">
                          Terms & Conditions
                        </button>{" "}
                        and{" "}
                        <button type="button" className="text-[#FC5D01] hover:text-orange-600 underline">
                          Privacy Policy
                        </button>
                      </Label>
                    </div>
                    {errors.terms && (
                      <p className="text-red-500 text-xs text-center">{errors.terms.message}</p>
                    )}

                    <Button 
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-[#0000FF] hover:bg-blue-700 text-white py-6 text-sm font-medium"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Processing...
                        </>
                      ) : (
                        "Book and pay"
                      )}
                    </Button>
                  </div>
                </div>
              </form>
            </div>

            {/* Pricing Sidebar */}
            <div className="lg:col-span-2">
              <div className="bg-white max-w-sm mx-auto sticky top-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-[#666666] py-2 rounded-lg">
                    <Info className="w-4 h-4" />
                    You are on your way to getting a great deal!
                  </div>

                  {/* Price Breakdown Details */}
                  {breakdownData.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-[#333333]">Price Breakdown:</h4>
                      {breakdownData.map((breakdown, index) => (
                        <div key={index} className="flex justify-between text-xs text-[#666666]">
                          <span>
                            {formatDate(breakdown.from_date)} - {formatDate(breakdown.to_date)}
                          </span>
                          <span>{formatCurrency(breakdown.price, breakdown.currency)}</span>
                        </div>
                      ))}
                      <hr className="border-gray-200" />
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-[#808080]">Price per night</span>
                    <span className="font-medium">
                      {breakdownData.length > 0 
                        ? formatCurrency(pricing.subtotal / pricing.nights, pricing.currency)
                        : `$${(Number(bookingData?.room?.TotalPrice) / nights).toFixed(2)}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Adult (s)</span>
                    <span className="font-medium">{totalAdults}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Children</span>
                    <span className="font-medium">{totalChildren}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Number of nights</span>
                    <span className="font-medium">{pricing.nights || nights}</span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Subtotal</span>
                    <span className="font-medium">
                      {breakdownData.length > 0 
                        ? formatCurrency(pricing.subtotal, pricing.currency)
                        : `$${(Number(bookingData?.room?.TotalPrice)).toFixed(2)}`
                      }
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Taxes and fees</span>
                    <span className="font-medium">
                      {breakdownData.length > 0 
                        ? formatCurrency(pricing.taxes, pricing.currency)
                        : "$98.70"
                      }
                    </span>
                  </div>
                  <hr className="border-gray-200" />
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Charges</span>
                    <span>
                      {breakdownData.length > 0 
                        ? formatCurrency(pricing.total, pricing.currency)
                        : `$${(164 * nights + 98.70).toFixed(2)}`
                      }
                    </span>
                  </div>
                  <p className="text-xs text-[#808080] text-center">
                    Prices include all taxes and fees
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
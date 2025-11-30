"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Info, ChevronLeft, Check, Lock, Clock, ShieldCheck, Star, ConstructionIcon, Mail, AlertTriangle } from "lucide-react";
import { useForm } from "react-hook-form";
import dynamic from 'next/dynamic';
import { toast } from 'sonner';

// Dynamic import for Paystack to avoid SSR issues
const PaystackButton = dynamic(() => import('react-paystack').then(mod => mod.PaystackButton), {
  ssr: false
});

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
  guestLeaderEmail: string;
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

interface RoomBreakdown {
  room_type: string;
  children: number;
  cots: number;
  price_breakdown: PriceBreakdown[];
}

interface PriceBreakdownResponse {
  success: boolean;
  hotel_name: string;
  hotel_search_code: string;
  total_rooms: number;
  rooms: RoomBreakdown[];
}

interface Evaluation {
  remarks: string;
}

// Constants
const BOOKING_TIMEOUT = 30 * 60; // 30 minutes in seconds
const TIMER_STORAGE_KEY = 'booking_session_start_time';

export function BookingDetails() {
  const [isPoliciesDialogOpen, setIsPoliciesDialogOpen] = useState(false);
  const [bookingData, setBookingData] = useState<{hotel: any; room: any;}>({hotel: null, room: null});
  const [breakdownData, setBreakdownData] = useState<PriceBreakdownResponse | null>(null);
  const [evaluationData, setEvaluationData] = useState<Evaluation | null>(null);
  const [roomForms, setRoomForms] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Payment state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaystackButton, setShowPaystackButton] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

  const validOptions = [
    "connectingRooms",
    "adjoiningRooms",
    "nonSmoking",
    "honeymoon",
    "extraBed",
  ];

  // Initialize React Hook Form
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isValid },
    watch,
    setValue,
    getValues,
    trigger
  } = useForm<GuestForm>({
    defaultValues: {
      guestLeaderEmail: "",
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
    },
    mode: "onChange"
  });

  // Get URL parameters
  const totalRooms = parseInt(params.get("totalRooms") || "1");
  const checkInDate = params.get("checkInDate") || "";
  const checkOutDate = params.get("checkOutDate") || "";

  const calculateNights = () => {
    if (!checkInDate || !checkOutDate) return 0;
    const start = new Date(checkInDate);
    const end = new Date(checkOutDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const nights = calculateNights();

  // Calculate pricing from breakdown data
  const calculatePricing = () => {
    if (!breakdownData || !breakdownData.success || !breakdownData.rooms) {
      return {
        subtotal: 0,
        taxes: 0,
        total: 0,
        currency: 'USD',
        nights: nights,
        perNightPrice: 0
      };
    }

    const subtotal = breakdownData.rooms.reduce((total, room) => {
      const roomTotal = room.price_breakdown.reduce((roomSum, breakdown) => {
        const fromDate = new Date(breakdown.from_date);
        const toDate = new Date(breakdown.to_date);
        const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
        const displayPrice = diffDays > 1 ? breakdown.price * nights : breakdown.price;
        
        return roomSum + displayPrice;
      }, 0);
      return total + roomTotal;
    }, 0);

    const roomTotalPrice = bookingData?.room?.TotalPrice || 0;
    const taxes = Math.max(0, roomTotalPrice - subtotal);
    const total = subtotal + taxes;
    const currency = breakdownData.rooms[0]?.price_breakdown[0]?.currency || 'USD';
    const perNightPrice = subtotal / nights;

    return {
      subtotal,
      taxes,
      total,
      currency,
      nights,
      perNightPrice
    };
  };

  const pricing = calculatePricing();

  // Paystack configuration
  const paystackConfig = {
    reference: new Date().getTime().toString(),
    email: watch("guestLeaderEmail") || "customer@example.com",
    amount: Math.round(pricing.total * 100), // Convert to kobo
    publicKey: process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY || "your_public_key_here",
    currency: "NGN",
    metadata: {
      custom_fields: [
        {
          display_name: "Booking Type",
          variable_name: "booking_type",
          value: "Hotel Booking"
        },
        {
          display_name: "Hotel Name",
          variable_name: "hotel_name",
          value: bookingData?.room?.hotelName || "Unknown Hotel"
        }
      ]
    }
  };

  // Paystack success callback
  const handlePaystackSuccess = async (reference: any) => {
    console.log("Payment successful:", reference);
    setIsProcessingPayment(true);

    const paymentToast = toast.loading('Verifying your payment...');
    
    try {
      // Verify payment with your backend
      const formData = new URLSearchParams();
      formData.append('reference', reference.reference);

      const verificationResponse = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/paymentVerification`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString()
      });

      const verificationResult = await verificationResponse.json();

      if (verificationResult.status) {
        toast.success('Payment verified successfully!', { id: paymentToast });
        // Payment verified successfully, submit the booking
        await submitBookingForm(reference.reference);
      } else {
        throw new Error(verificationResult.message || "Payment verification failed");
      }

    } catch (error) {
      console.error("Payment process failed:", error);
      //alert(`Payment process failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      toast.error(`Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: paymentToast });
    } finally {
      setIsProcessingPayment(false);
      setShowPaystackButton(false);
    }
  };

  // Paystack close callback
  const handlePaystackClose = () => {
    console.log("Payment dialog closed");
    setIsProcessingPayment(false);
    setShowPaystackButton(false);
    toast.info('Payment was cancelled. You can try again when ready.');
  };

  // Paystack component props
  const paystackComponentProps = {
    ...paystackConfig,
    text: "Pay with Paystack",
    onSuccess: (reference: any) => handlePaystackSuccess(reference),
    onClose: handlePaystackClose,
    className: "w-full bg-green-600 hover:bg-green-700 text-white py-3 text-sm font-medium rounded-lg flex items-center justify-center gap-2"
  };

  // Prepare form data for submission
  const getFormDataForSubmission = (paymentReference: string) => {
    const data = getValues();
    
    const formData = new URLSearchParams();
    
    // Add basic booking information
    formData.append('hotelSearchCode', params.get("hotelSearchCode") || "");
    formData.append('hotelCode', params.get("hotelCode") || "");
    formData.append('checkInDate', checkInDate);
    formData.append('nights', nights.toString());
    formData.append('totalRooms', totalRooms.toString());
    
    // Add guest leader email
    formData.append('guestLeaderEmail', data.guestLeaderEmail);
    
    // Add room-wise guest details
    data.rooms.forEach((room, roomIndex) => {
      room.adults.forEach((adult, adultIndex) => {
        formData.append(`room${roomIndex + 1}_adult${adultIndex + 1}_title`, adult.title);
        formData.append(`room${roomIndex + 1}_adult${adultIndex + 1}_firstName`, adult.firstName);
        formData.append(`room${roomIndex + 1}_adult${adultIndex + 1}_lastName`, adult.lastName);
      });
      
      room?.children?.forEach((child, childIndex) => {
        formData.append(`room${roomIndex + 1}_child${childIndex + 1}_title`, child.title);
        formData.append(`room${roomIndex + 1}_child${childIndex + 1}_firstName`, child.firstName);
        formData.append(`room${roomIndex + 1}_child${childIndex + 1}_lastName`, child.lastName);
        formData.append(`room${roomIndex + 1}_child${childIndex + 1}_age`, child.age);
      });
    });
    
    // Add options
    formData.append('lateArrivalHours', data.options.lateArrivalHours || "");
    formData.append('lateArrivalMinutes', data.options.lateArrivalMinutes || "");
    formData.append('connectingRooms', data.options.connectingRooms ? "true" : "false");
    formData.append('adjoiningRooms', data.options.adjoiningRooms ? "true" : "false");
    formData.append('nonSmoking', data.options.nonSmoking ? "true" : "false");
    formData.append('honeymoon', data.options.honeymoon ? "true" : "false");
    formData.append('extraBed', data.options.extraBed ? "true" : "false");
    
    // Add notes
    if (data.notes) {
      formData.append('notes', data.notes);
    }
    
    // Add terms acceptance
    formData.append('termsAccepted', data.terms ? "true" : "false");

    // Add payment information
    formData.append('paymentMethod', 'paystack');
    formData.append('paymentAmount', pricing.total.toString());
    formData.append('paymentReference', paymentReference);

    return formData;
  };

  // Submit booking form
  const submitBookingForm = async (paymentReference: string) => {
    const bookingToast = toast.loading('Processing your booking...');
    
    try {
      const formData = getFormDataForSubmission(paymentReference);

      console.log("Submitting booking form");

      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/bookHotel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formData.toString(),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("Booking response:", result);

      if (result.success) {
        toast.success('Booking confirmed! Redirecting...', { id: bookingToast });
        // Clear timer and cache on successful booking
        cleanupTimer();
        clearBookingCache();
        
        // Redirect to confirmation page
        router.push("/booking-confirmation?booking_code=" + result.booking_reference);
      } else {
        throw new Error(result.message || "Booking failed");
      }
      
    } catch (error) {
      console.error("Booking submission failed:", error);
      toast.error(`Booking failed: ${error instanceof Error ? error.message : 'Unknown error'}`, { id: bookingToast });
    }
  };

  // Form submission handler - Only triggers Paystack after validation
  const onSubmit = async (data: GuestForm) => {
    console.log("Form validation passed, showing Paystack button");
    
    // Check if amount is valid
    if (pricing.total <= 0) {
      toast.error('Invalid booking amount. Please try again.');
      return;
    }

    // If form is valid, show Paystack button
    setShowPaystackButton(true);
  };

  // Handle form validation before showing Paystack
  const handlePaystackInitiation = async () => {
    // Trigger form validation
    const isValid = await trigger();
    
    if (!isValid) {
      toast.error('Please fix the form errors before proceeding to payment.');
      return;
    }

    // Check if amount is valid
    if (pricing.total <= 0) {
      toast.error('Invalid booking amount. Please try again.');
      return;
    }

    // If everything is valid, show Paystack button
    setShowPaystackButton(true);
    toast.success('Form validated! Opening payment gateway...');
  };

  // Timer initialization and management
  const initializeTimer = useCallback(() => {
    const now = Math.floor(Date.now() / 1000);
    const storedStartTime = localStorage.getItem(TIMER_STORAGE_KEY);
    
    if (storedStartTime) {
      const startTime = parseInt(storedStartTime);
      const elapsedTime = now - startTime;
      const remainingTime = Math.max(0, BOOKING_TIMEOUT - elapsedTime);
      
      setTimeLeft(remainingTime);
      
      if (remainingTime <= 0) {
        setShowTimeoutModal(true);
      }
    } else {
      router.back();
    }
  }, [router]);

  const handleTimeoutRedirect = useCallback(() => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
    clearBookingCache();
    setShowTimeoutModal(false);
    router.back();
  }, [router]);

  const cleanupTimer = () => {
    localStorage.removeItem(TIMER_STORAGE_KEY);
  };

  // Initialize timer on component mount
  useEffect(() => {
    initializeTimer();
  }, [initializeTimer]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) {
      if (timeLeft === 0) {
        setShowTimeoutModal(true);
      }
      return;
    }

    const timerId = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime === null || prevTime <= 1) {
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timerId);
  }, [timeLeft]);

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
      
      for (let j = 1; j <= adults; j++) {
        adultForms.push({
          title: "mr",
          firstName: "",
          lastName: ""
        });
        totalAdults++;
      }
      
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
    
    roomFormsData.forEach((room, roomIndex) => {
      room.adults.forEach((adult, adultIndex) => {
        setValue(`rooms.${roomIndex}.adults.${adultIndex}`, adult);
      });
      room.children.forEach((child, childIndex) => {
        setValue(`rooms.${roomIndex}.children.${childIndex}`, child);
      });
    });
  }, [totalRooms, params, setValue]);

  // Format time for display (MM:SS)
  const formatTime = (seconds: number | null) => {
    if (seconds === null) return "30:00";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Fetch hotel information and price breakdown
  const fetchHotelInformation = useCallback(async () => {
    setLoading(true);
    const hotelSearchCode = params.get("hotelSearchCode") || "";
    const checkInDate = params.get("checkInDate") || "";
    const hotelCode = params.get("hotelCode") || "";

    try {
      const [evaluationResponse, priceResponse] = await Promise.all([
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
      
      if (evaluationData) {
        setEvaluationData(evaluationData);
      }
      
      if (priceData && priceData.success) {
        setBreakdownData(priceData);
      }
      
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error('Failed to load hotel information. Please refresh the page.');
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

  // Calculate total price for a specific room
  const calculateRoomTotal = (room: RoomBreakdown) => {
    return room.price_breakdown.reduce((total, breakdown) => total + breakdown.price, 0);
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

          <div className="absolute left-[8%] flex items-center gap-4">
            <Button
              size={"icon"}
              onClick={() => {
                cleanupTimer();
                router.back();
              }}
              className="border border-[#CCCCCC] hover:bg-white/90 bg-white"
            >
              <ChevronLeft className="h-4 w-4 text-[#666]" />
            </Button>

            {/* Countdown Timer Display */}
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg border border-gray-200 shadow-sm">
              <Clock className="h-4 w-4 text-[#666]" />
              <div className="flex flex-col">
                <span className="text-xs text-[#666]">Time remaining</span>
                <span className="text-sm font-semibold text-[#333]">
                  {formatTime(timeLeft)}
                </span>
              </div>
            </div>
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
                  {bookingData?.hotel?.RoomFacilities?.length > 0 && (
                    <FacilityList facilities={bookingData.hotel.RoomFacilities} maxFacilities={10} />
                  )}
                </div>

                <hr />

                {/* Remarks */}
                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-medium text-[#4D4D4D] mb-4">
                    Remarks
                  </h3>
                  <p className="text-sm text-[#666666]">
                    {evaluationData?.remarks ? (
                      <span dangerouslySetInnerHTML={{ __html: evaluationData.remarks }} />
                    ) : (
                      "No remarks"
                    )}
                  </p>
                </div>
              </div>

              {/* Guest Information Form */}
              <form onSubmit={handleSubmit(onSubmit)}>
                <div className="rounded-lg border border-[#ccc] py-6">
                  {/* Guest Leader Email Section */}
                  <div className="px-6 pb-6 border-b border-gray-200">
                    <h3 className="text-lg font-medium text-[#333333] mb-4">
                      Contact Information
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="guestLeaderEmail" className="text-sm font-medium text-gray-700 mb-2 block">
                          Guest Leader Email Address *
                        </Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                          <Input
                            id="guestLeaderEmail"
                            type="email"
                            placeholder="Enter email address for booking confirmation"
                            className="pl-10 h-12"
                            {...register("guestLeaderEmail", {
                              required: "Email address is required",
                              pattern: {
                                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                                message: "Invalid email address"
                              }
                            })}
                          />
                        </div>
                        {errors.guestLeaderEmail && (
                          <p className="text-red-500 text-xs mt-1">{errors.guestLeaderEmail.message}</p>
                        )}
                        <p className="text-xs text-gray-500 mt-1">
                          We'll send your booking confirmation and updates to this email address
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="px-6 pt-6">
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
                            {room.adults.map((_: any, adultIndex: number) => (
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
                            {room.children.map((child: any, childIndex: number) => (
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
                        { id: "adjoining", label: "If possible, provide adjacent rooms", name: "adjoiningRooms" },
                        { id: "nonsmoking", label: "If possible, provide non-smoking room", name: "nonSmoking" },
                        { id: "honeymoon", label: "Kindly request special treatment as the booking is for Honeymooners", name: "honeymoon" },
                        { id: "extrabed", label: "Request for an extra bed", name: "extraBed" }
                      ].map((option) => (
                        <div key={option.id} className="flex items-center gap-4">
                          <Checkbox
                            id={option.id}
                            checked={watch(`options.${option.name}` as any) || false}
                            onCheckedChange={(checked) => {
                              setValue(`options.${option.name}` as any, checked === true, { shouldValidate: true });
                            }}
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

                {/* Payment Section - Only Paystack */}
                <div className="border border-[#ccc] rounded-lg p-6 mt-6">
                 
                  <div className="mt-8 space-y-4">
                    <div className="flex items-center justify-center gap-2">
                      <Checkbox 
                        id="terms"
                        {...register("terms", { required: "You must agree to the terms and conditions" })}
                        checked={watch("terms") || false}
                        onCheckedChange={(checked) => {
                          setValue("terms", checked === true, { shouldValidate: true });
                        }}
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

                    {/* Payment Button */}
                    {!showPaystackButton ? (
                      <Button 
                        type="submit"
                        disabled={isSubmitting || loading || isProcessingPayment}
                        className="w-full bg-[#0000FF] hover:bg-blue-700 text-white py-6 text-sm font-medium"
                        onClick={handlePaystackInitiation}
                      >
                        {isProcessingPayment ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Processing...
                          </>
                        ) : (
                          "Proceed to Payment"
                        )}
                      </Button>
                    ) : (
                      <PaystackButton {...paystackComponentProps} />
                    )}

                    {/* Payment Security Notice */}
                    <div className="flex items-center justify-center gap-2 text-xs text-green-600 mt-2">
                      <ShieldCheck className="w-4 h-4" />
                      <span>Your payment is secure and encrypted</span>
                    </div>
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
                  {breakdownData?.success && breakdownData.rooms && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium text-[#333333]">Room Breakdown:</h4>
                      {breakdownData.rooms.map((room, roomIndex) => (
                        <div key={roomIndex} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-sm font-medium text-[#333333]">
                              Room {roomIndex + 1}
                            </span>
                            <span className="text-sm font-medium">
                              {formatCurrency(calculateRoomTotal(room), pricing.currency)}
                            </span>
                          </div>
                          <p className="text-xs text-[#666666] mb-2">
                            {room.room_type} • {room.children} child(ren)
                          </p>
                          
                          {/* Individual price breakdown for this room */}
                          <div className="space-y-1 text-xs">
                            {room.price_breakdown.map((breakdown, breakdownIndex) => {
                                const fromDate = new Date(breakdown.from_date);
                                const toDate = new Date(breakdown.to_date);
                                const diffDays = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
                                const displayPrice = diffDays > 1 ? breakdown.price * nights : breakdown.price;
                                
                                return (
                                  <div key={breakdownIndex} className="flex justify-between text-[#666666]">
                                    <span>
                                      {formatDate(breakdown.from_date)} - {formatDate(breakdown.to_date)}
                                    </span>
                                    <span>{formatCurrency(displayPrice, breakdown.currency)}</span>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      ))}
                      <hr className="border-gray-200" />
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="text-[#808080]">Price per night(Average)</span>
                    <span className="font-medium">
                      {breakdownData?.success && breakdownData?.rooms.length > 0
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
                  <div className="flex justify-between text-sm">
                      <span className="text-[#666666]">Number of rooms</span>
                      <span className="font-medium">{breakdownData?.total_rooms || totalRooms}</span>
                  </div>
                  <hr className="border-gray-200" />
                  {/* Subtotal (Sum of all room breakdowns) */}
                  <div className="flex justify-between text-sm">
                      <span className="text-[#666666]">Subtotal</span>
                      <span className="font-medium">
                        {formatCurrency(pricing.subtotal, pricing.currency)}
                      </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#666666]">Taxes and fees</span>
                    <span className="font-medium">
                      {breakdownData?.success && breakdownData?.rooms.length > 0 
                        ? formatCurrency(pricing.taxes, pricing.currency)
                        : "$0.00"
                      }
                    </span>
                  </div>
                  <hr className="border-gray-200" />
                  {/* Total (Subtotal + Taxes) */}
                  <div className="flex justify-between text-lg font-semibold">
                    <span>Total Charges</span>
                    <span>
                      {formatCurrency(pricing.total, pricing.currency)}
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

      {/* Timeout Modal */}
      {showTimeoutModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex items-center gap-3 mb-4">
              <AlertTriangle className="h-6 w-6 text-red-600" />
              <h3 className="text-lg font-semibold text-red-600">Booking Session Expired</h3>
            </div>
            <p className="text-gray-700 mb-4">
              Your 30-minute booking session has ended. This ensures room availability for all guests. 
              Please start over to continue with your booking.
            </p>
            <div className="flex justify-end">
              <Button
                onClick={handleTimeoutRedirect}
                className="bg-[#0000FF] hover:bg-blue-700"
              >
                Return to Hotel Search
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
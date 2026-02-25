"use client";

import { useState, useCallback, useEffect } from "react";
import Image from "next/image";
import { Info, ChevronLeft, Check, Lock, Clock, ShieldCheck, Star, Mail, AlertTriangle, User, Calendar, Home, CreditCard, Phone, FileText, X } from "lucide-react";
import { useForm } from "react-hook-form";
import dynamic from 'next/dynamic';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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
import { getCachedBookingData, clearBookingCache } from '@/components/bookingCache';
import { getFacilityIcon } from '@/components/facilities-icons';

// Define form types
interface GuestForm {
  guestLeaderEmail: string;
  guestLeaderPhone?: string;
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
  remarks: string[] | string;
  price: number;
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
  const [isInitializingPayment, setIsInitializingPayment] = useState(false);
  
  // Payment state
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [showPaystackButton, setShowPaystackButton] = useState(false);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showTimeoutModal, setShowTimeoutModal] = useState(false);
  
  const router = useRouter();
  const params = useSearchParams();
  const pathname = usePathname();

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
      guestLeaderPhone: "",
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

    const roomTotalPrice = evaluationData && evaluationData?.price > 0 ? evaluationData.price : bookingData?.room?.TotalPrice || 0;
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
        toast.update(paymentToast, { render: "Payment verified successfully!", type: "success", isLoading: false });
        // Payment verified successfully, submit the booking
        await submitBookingForm(reference.reference);
      } else {
        toast.update(paymentToast, { render: verificationResult.message || "Payment verification failed", type: "error", isLoading: false });
      }

    } catch (error) {
      console.error("Payment process failed:", error);
      toast.update(paymentToast, { render: `Payment verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`, type: "error", isLoading: false });
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
    if (data.guestLeaderPhone) {
      formData.append('guestLeaderPhone', data.guestLeaderPhone);
    }
    
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
        toast.update(bookingToast, { render: "Booking confirmed! Redirecting...", type: "success", isLoading: false });
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
      toast.update(bookingToast, { render: `Booking failed: ${error instanceof Error ? error.message : 'Unknown error'}`, type: "error", isLoading: false });
      
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
    setIsInitializingPayment(true);
    setShowPaystackButton(true);
    toast.success('Form validated! Opening payment gateway...');

    // Reset the initializing state after a short delay
    setTimeout(() => {
      setIsInitializingPayment(false);
    }, 1000);
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
            className={`h-3 w-3 ${
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
        <div className="flex flex-wrap gap-1">
          {facilitiesToDisplay.map((facility, index) => {
            const IconComponent = getFacilityIcon(facility);
            return (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-700 text-xs"
              >
                <IconComponent className="h-3 w-3" />
                <span>{facility}</span>
              </span>
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
      day: 'numeric' 
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

  // Extract cancellation policy from remarks using regex
  const extractCancellationPolicy = () => {
    if (!evaluationData?.remarks) return null;
    
    const remarks = Array.isArray(evaluationData.remarks) 
      ? evaluationData.remarks 
      : [evaluationData.remarks];
    
    // Regex to find cancellation policy pattern
    const cxlRegex = /STARTING\s+(\d{2}\/\d{2}\/\d{4})\s+CXL-PENALTY\s+FEE\s+IS\s+(\d+\.?\d*)%\s+OF\s+BOOKING\s+PRICE\.?(.*?)(?=\.|$)/i;
    
    for (const remark of remarks) {
      const match = remark.match(cxlRegex);
      if (match) {
        return {
          startingDate: match[1],
          penaltyPercentage: match[2],
          additionalInfo: match[3]?.trim() || ""
        };
      }
    }
    return null;
  };

  // Get all remarks except cancellation policy
  const getOtherRemarks = () => {
    if (!evaluationData?.remarks) return [];
    
    const remarks = Array.isArray(evaluationData.remarks) 
      ? evaluationData.remarks 
      : [evaluationData.remarks];
    
    const cxlRegex = /STARTING\s+\d{2}\/\d{2}\/\d{4}\s+CXL-PENALTY\s+FEE\s+IS\s+\d+\.?\d*%\s+OF\s+BOOKING\s+PRICE\.?.*?/i;
    
    return remarks.filter(remark => !cxlRegex.test(remark));
  };

  const cancellationPolicy = extractCancellationPolicy();
  const otherRemarks = getOtherRemarks();

  const renderRemark = (remark: string, index: number) => {
  // First decode HTML entities
  const textarea = document.createElement('textarea');
  textarea.innerHTML = remark;
  const decodedRemark = textarea.value;
  
  // Check if the decoded content contains HTML tags
  const containsHtml = /<[a-z][\s\S]*>/i.test(decodedRemark);
  
  return (
    <div key={index} className="border-b border-gray-100 last:border-0 pb-3 last:pb-0">
      {containsHtml ? (
        <div 
          className="text-sm text-gray-700 prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: decodedRemark }} 
        />
      ) : (
        <p className="text-sm text-gray-700">{decodedRemark}</p>
      )}
    </div>
  );
};


  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />

      <div className="min-h-screen bg-gray-50">
        {/* Compact Header */}
        <div className="bg-white border-b sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    cleanupTimer();
                    router.back();
                  }}
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                
                {/* Compact Timer */}
                <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-full">
                  <Clock className="h-3 w-3 text-gray-600" />
                  <span className="text-xs font-medium">{formatTime(timeLeft)}</span>
                </div>
              </div>

              {/* Progress Steps - Compact */}
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                  <div className="w-6 h-0.5 bg-blue-600"></div>
                </div>
                <div className="flex items-center">
                  <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-xs text-white">2</span>
                  </div>
                  <div className="w-6 h-0.5 bg-gray-300"></div>
                </div>
                <div className="w-6 h-6 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-xs text-gray-500">3</span>
                </div>
              </div>

              {/* Trust Badges - Compact */}
              <div className="hidden sm:flex items-center gap-3">
                <div className="flex items-center gap-1 text-gray-500">
                  <Lock className="h-3 w-3" />
                  <span className="text-xs">Secure</span>
                </div>
                <div className="flex items-center gap-1 text-gray-500">
                  <ShieldCheck className="h-3 w-3" />
                  <span className="text-xs">Protected</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto p-4">
          {/* Main Grid - 2 columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Left Column - Forms (2/3 width on desktop) */}
            <div className="lg:col-span-2 space-y-4">
              {/* Hotel Summary Card - Compact */}
              <div className="bg-white rounded-lg border p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h1 className="font-semibold">{bookingData?.room?.hotelName || "Hotel Name"}</h1>
                    <div className="flex items-center gap-2 mt-1">
                      <StarRating rating={Number(bookingData?.hotel?.hotelInfo?.category) || 0} />
                      <span className="text-xs text-gray-500">•</span>
                      <span className="text-xs text-gray-500">{bookingData?.room?.hotelAddress?.split(',')[0]}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-gray-500">Total</div>
                    <div className="font-bold text-blue-600">{formatCurrency(pricing.total, pricing.currency)}</div>
                  </div>
                </div>

                {/* Stay Details - Compact Grid */}
                <div className="grid lg:grid-cols-5 grid-cols-3 gap-2 mt-3 text-center text-xs">
                  <div className="bg-gray-50 p-2 rounded">
                    <Calendar className="h-3 w-3 mx-auto text-gray-400" />
                    <div className="font-medium mt-1">{formatDate(checkInDate)}</div>
                    <div className="text-gray-500">Check-in</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <Calendar className="h-3 w-3 mx-auto text-gray-400" />
                    <div className="font-medium mt-1">{formatDate(checkOutDate)}</div>
                    <div className="text-gray-500">Check-out</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <Clock className="h-3 w-3 mx-auto text-gray-400" />
                    <div className="font-medium mt-1">{pricing.nights}</div>
                    <div className="text-gray-500">Nights</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <User className="h-3 w-3 mx-auto text-gray-400" />
                    <div className="font-medium mt-1">{totalAdults}</div>
                    <div className="text-gray-500">Adults</div>
                  </div>
                  <div className="bg-gray-50 p-2 rounded">
                    <Home className="h-3 w-3 mx-auto text-gray-400" />
                    <div className="font-medium mt-1">{totalRooms}</div>
                    <div className="text-gray-500">Rooms</div>
                  </div>
                </div>

                {/* Room Type */}
                <div className="mt-3 text-sm">
                  <span className="font-medium">{bookingData?.room?.Rooms?.[0] || "Room Type"}</span>
                  {bookingData?.room?.Special && (
                    <span className="ml-2 text-xs text-green-600">{bookingData.room.Special}</span>
                  )}
                </div>

                {/* Facilities - Compact */}
                {bookingData?.hotel?.RoomFacilities?.length > 0 && (
                  <div className="mt-2">
                    <FacilityList facilities={bookingData.hotel.RoomFacilities.slice(0, 5)} />
                  </div>
                )}

                {/* View Policies Button */}
                {evaluationData?.remarks && (
                  <button 
                    onClick={handlePoliciesClick}
                    className="mt-2 text-xs text-blue-600 flex items-center gap-1 hover:underline"
                  >
                    <FileText className="h-3 w-3" /> View cancellation policiies & remarks
                  </button>
                )}
              </div>

              {/* Contact Information - Compact */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-sm font-medium mb-3">Contact Information</h3>
                <div className="space-y-3">
                  <div>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                      <Input
                        placeholder="Email address"
                        className="pl-8 h-10 text-sm"
                        {...register("guestLeaderEmail", {
                          required: "Email required",
                          pattern: {
                            value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                            message: "Invalid email"
                          }
                        })}
                      />
                    </div>
                    {errors.guestLeaderEmail && (
                      <p className="text-red-500 text-xs mt-1">{errors.guestLeaderEmail.message}</p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3" />
                      <Input
                        placeholder="Phone number (optional)"
                        className="pl-8 h-10 text-sm"
                        {...register("guestLeaderPhone")}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Guest Details - Compact per room */}
              <div className="space-y-3">
                {roomForms.map((room, roomIndex) => (
                  <div key={roomIndex} className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium text-sm">Room {roomIndex + 1}</h4>
                      <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {room.adults.length} Adult{room.adults.length > 1 ? 's' : ''}, {room.children.length} Child{room.children.length > 1 ? 'ren' : ''}
                      </span>
                    </div>

                    {/* Adults */}
                    {room.adults.map((_: any, adultIndex: number) => (
                      <div key={adultIndex} className="mb-3 pb-3 border-b last:border-0 last:pb-0">
                        <p className="text-xs text-gray-500 mb-2">Adult {adultIndex + 1}</p>
                        <div className="grid lg:grid-cols-5 gap-2">
                          <div>
                            <Select 
                              onValueChange={(value) => setValue(`rooms.${roomIndex}.adults.${adultIndex}.title`, value)}
                              defaultValue="mr"
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="mr">Mr.</SelectItem>
                                <SelectItem value="mrs">Mrs.</SelectItem>
                                <SelectItem value="ms">Ms.</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Input
                              placeholder="First name"
                              className="h-9 text-sm"
                              {...register(`rooms.${roomIndex}.adults.${adultIndex}.firstName`, { 
                                required: "Required"
                              })}
                            />
                          </div>
                          <div>
                            <Input
                              placeholder="Last name"
                              className="h-9 text-sm"
                              {...register(`rooms.${roomIndex}.adults.${adultIndex}.lastName`, { 
                                required: "Required"
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}

                    {/* Children */}
                    {room.children.map((child: any, childIndex: number) => (
                      <div key={childIndex} className="mb-3 last:mb-0">
                        <p className="text-xs text-gray-500 mb-2">Child {childIndex + 1} (Age: {child.age})</p>
                        <div className="grid lg:grid-cols-5 gap-2">
                          <div>
                            <Select 
                              onValueChange={(value) => setValue(`rooms.${roomIndex}.children.${childIndex}.title`, value)}
                              defaultValue="child"
                            >
                              <SelectTrigger className="h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="child">Child</SelectItem>
                                <SelectItem value="master">Master</SelectItem>
                                <SelectItem value="miss">Miss</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Input
                              placeholder="First name"
                              className="h-9 text-sm"
                              {...register(`rooms.${roomIndex}.children.${childIndex}.firstName`, { 
                                required: "Required"
                              })}
                            />
                          </div>
                          <div>
                            <Input
                              placeholder="Last name"
                              className="h-9 text-sm"
                              {...register(`rooms.${roomIndex}.children.${childIndex}.lastName`, { 
                                required: "Required"
                              })}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>

              {/* Options & Notes - Compact */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-sm font-medium mb-3">Special Requests</h3>
                
                {/* Late Arrival */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs text-gray-600">Late arrival:</span>
                  <Input type="number" placeholder="HH" className="w-12 h-8 text-center text-sm" {...register("options.lateArrivalHours")} />
                  <span className="text-xs">:</span>
                  <Input type="number" placeholder="MM" className="w-12 h-8 text-center text-sm" {...register("options.lateArrivalMinutes")} />
                </div>

                {/* Options Grid */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[
                    { id: "connecting", label: "Connecting rooms", name: "connectingRooms" },
                    { id: "adjoining", label: "Adjacent rooms", name: "adjoiningRooms" },
                    { id: "nonsmoking", label: "Non-smoking", name: "nonSmoking" },
                    { id: "honeymoon", label: "Honeymoon setup", name: "honeymoon" },
                    { id: "extrabed", label: "Extra bed", name: "extraBed" }
                  ].map((option) => (
                    <div key={option.id} className="flex items-center gap-2">
                      <Checkbox
                        id={option.id}
                        checked={watch(`options.${option.name}` as any) || false}
                        onCheckedChange={(checked) => {
                          setValue(`options.${option.name}` as any, checked === true);
                        }}
                      />
                      <Label htmlFor={option.id} className="text-xs text-gray-700">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <Textarea
                  placeholder="Additional notes (optional)"
                  className="text-sm h-16"
                  {...register("notes")}
                />
              </div>
            </div>

            {/* Right Column - Pricing & Payment (1/3 width on desktop) */}
            <div className="space-y-4">
              <div className="bg-white rounded-lg border p-4 sticky top-20">
                <h3 className="font-medium text-sm mb-3">Price Summary</h3>
                
                {/* Quick Price Breakdown */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatCurrency(pricing.subtotal, pricing.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Taxes & fees</span>
                    <span>{formatCurrency(pricing.taxes, pricing.currency)}</span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Total</span>
                      <span className="text-blue-600">{formatCurrency(pricing.total, pricing.currency)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1 text-right">Includes all taxes</p>
                  </div>
                </div>

                {/* Per night breakdown if available */}
                {breakdownData?.rooms && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs text-gray-500 mb-2">Nightly breakdown</p>
                    {breakdownData.rooms[0]?.price_breakdown.map((bd, i) => (
                      <div key={i} className="flex justify-between text-xs text-gray-600">
                        <span>{formatDate(bd.from_date)}</span>
                        <span>{formatCurrency(bd.price, bd.currency)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Terms Checkbox */}
                <div className="mt-4">
                  <div className="flex items-start gap-2">
                    <Checkbox 
                      id="terms"
                      {...register("terms", { required: "You must agree to continue" })}
                      className="mt-0.5"
                    />
                    <Label htmlFor="terms" className="text-xs text-gray-600">
                      I agree to the <button type="button" onClick={handlePoliciesClick} className="text-blue-600 hover:underline">Terms</button> and <button type="button" onClick={handlePoliciesClick} className="text-blue-600 hover:underline">Privacy Policy</button>
                    </Label>
                  </div>
                  {errors.terms && (
                    <p className="text-red-500 text-xs mt-1">{errors.terms.message}</p>
                  )}
                </div>

                {/* Payment Button */}
                {!showPaystackButton ? (
                  <Button 
                    type="button"
                    disabled={isSubmitting || loading || isProcessingPayment || isInitializingPayment}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-3 h-10 text-sm"
                    onClick={handlePaystackInitiation}
                  >
                    {isInitializingPayment || isProcessingPayment ? (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Processing...</span>
                      </div>
                    ) : (
                      "Proceed to Payment"
                    )}
                  </Button>
                ) : (
                  <div className="relative mt-3">
                    <PaystackButton 
                      {...paystackComponentProps}
                      text="Pay with Paystack"
                    />
                  </div>
                )}

                {/* Security Notice */}
                <div className="flex items-center justify-center gap-1 mt-3 text-green-600 text-xs">
                  <ShieldCheck className="h-3 w-3" />
                  <span>Secure payment</span>
                </div>
              </div>

              {/* Cancellation Info */}
              <div className="bg-blue-50 rounded-lg border border-blue-100 p-3">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-blue-700">
                    {cancellationPolicy ? (
                      <>
                        Free cancellation before {formatDate(cancellationPolicy.startingDate)}. 
                        <button onClick={handlePoliciesClick} className="underline ml-1 font-medium">
                          See full policy
                        </button>
                      </>
                    ) : (
                      <>
                        Cancellation policy applies. 
                        <button onClick={handlePoliciesClick} className="underline ml-1 font-medium">
                          View details
                        </button>
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hotel Policies Dialog - Built directly on the page */}
      {isPoliciesDialogOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h2 className="font-semibold">Hotel Policies & Information</h2>
              <Button variant="ghost" size="icon" onClick={() => setIsPoliciesDialogOpen(false)} className="h-8 w-8">
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4 space-y-6">
              {/* Cancellation Policy Section */}
              {cancellationPolicy && (
                <div className="space-y-2">
                  <h3 className="font-medium text-sm text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Cancellation Policy
                  </h3>
                  <div className="bg-red-50 border border-red-100 rounded-lg p-3">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Valid from:</span>
                        <p className="font-medium">{cancellationPolicy.startingDate}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Penalty:</span>
                        <p className="font-medium text-red-600">{cancellationPolicy.penaltyPercentage}% of booking price</p>
                      </div>
                    </div>
                    {cancellationPolicy.additionalInfo && (
                      <p className="text-sm text-gray-700 mt-2 pt-2 border-t border-red-100">
                        {cancellationPolicy.additionalInfo}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Other Remarks */}
              {otherRemarks.length > 0 && (
                <div className="space-y-3">
                  <h3 className="font-medium text-sm">Hotel Policies & Information</h3>
                  <div className="space-y-3">
                    {otherRemarks.map((remark, index) => renderRemark(remark, index))}
                  </div>
                </div>
              )}
            </div>

            <div className="sticky bottom-0 bg-gray-50 border-t p-4">
              <Button 
                onClick={() => setIsPoliciesDialogOpen(false)} 
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Timeout Modal */}
      {showTimeoutModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-5 max-w-sm w-full">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              <h3 className="font-semibold">Session Expired</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              Your 30-minute booking session has ended. Please start over.
            </p>
            <Button
              onClick={handleTimeoutRedirect}
              className="w-full bg-blue-600 hover:bg-blue-700 h-9 text-sm"
            >
              Return to Search
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Facebook, Instagram, Mail, Twitter, Youtube } from "lucide-react";
import Image from "next/image";

export function Footer() {
  return (
    <footer className="bg-[#002366] text-white">
      {/* Legal text section */}
      <div className="max-w-7xl mx-auto w-full p-4">
        <div className="px-4 py-8">
          <div className="">
            <div className="text-sm leading-relaxed space-y-4">
              <p className="text-[#F8F9FA99]">
                <span className="font-semibold text-white">
                  AFROLIYAH, AFROLIYAH.COM, NAME YOUR OWN PRICE, EXPRESS DEALS,
                  TONIGHT ONLY DEAL
                </span>{" "}
                and{" "}
                <span className="font-semibold  text-white">PRICEBREAKER</span>{" "}
                are service marks or registered service marks of{" "}
                <span className="font-semibold  text-white">
                  afroliyah.com LLC
                </span>
                . All rights reserved.{" "}
                <span className="font-semibold  text-white">
                  afroliyah.com LLC
                </span>{" "}
                is located at 800 Connecticut Ave. NW, Norwalk, CT 06854.
              </p>
              <p className="text-[#F8F9FA99]">
                * Savings claim based on Express Deals® bookings compared to{" "}
                <span className="font-semibold  text-white">Afroliyah's</span>{" "}
                lowest retail rate for same itinerary. Express Deals® travel
                provider shown after booking.
              </p>
              <p className="text-[#F8F9FA99]">
                Package savings based on all flight and hotel itineraries booked
                together as a package, compared to price of same flight and
                hotel booked separately on afroliyah.com. Savings vary and may
                not be available for all packages.
              </p>
              <p className="text-[#F8F9FA99]">
                <span className="font-semibold  text-white">
                  * Afroliyah VIP Rewards™ Visa® Card
                </span>{" "}
                and Avis Budget Group Campaign: You will receive 10 points for
                every{" "}
                <span className="font-semibold  text-white">
                  $1 spent on Pay Now Afroliyah
                </span>{" "}
                rental car bookings from Avis or Budget when you pay with your{" "}
                <span className="font-semibold  text-whites">
                  Afroliyah VIP Rewards™ Visa® Card
                </span>
                . Not available on Pay Later or Package bookings. This benefit
                may be discontinued at any time. Offer subject to change without
                notice.
              </p>
            </div>
            <hr className="border-white my-8" />
          </div>
        </div>

        {/* Footer navigation */}
        <div className="px-4 pb-8">
          <div className="max-w-7xl mx-auto">
            <div className="grid grid-cols-2 md:grid-cols-6 gap-8">
              {/* Logo */}
              <div className="col-span-2 md:col-span-1">
                <Image src={"/logo.png"} alt="logo" width={100} height={20} />
                <p className="text-sm text-white">
                  Your gateway to extraordinary adventures
                </p>
              </div>

              {/* Company */}
              <div>
                <h3 className="font-semibold mb-4">Company</h3>
                <ul className="space-y-2 text-sm text-white">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      About Us
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Contact Us
                    </a>
                  </li>
                </ul>
              </div>

              {/* Services */}
              <div>
                <h3 className="font-semibold mb-4">Services</h3>
                <ul className="space-y-2 text-sm text-white">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Flight Booking
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Hotel Booking
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Rental Services
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Travel Guide{" "}
                    </a>
                  </li>
                </ul>
              </div>

              {/* Legal */}
              <div>
                <h3 className="font-semibold mb-4">Legal</h3>
                <ul className="space-y-2 text-sm text-white">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Terms of Service
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Privacy Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Cookies Policy
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Data Policy{" "}
                    </a>
                  </li>
                </ul>
              </div>

              {/* Support & Newsletter */}
              <div>
                <h3 className="font-semibold mb-4">Support</h3>
                <ul className="space-y-2 text-sm text-white mb-6">
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Help Center
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      How it works
                    </a>
                  </li>
                  <li>
                    <a href="#" className="hover:text-white transition-colors">
                      Security{" "}
                    </a>
                  </li>
                </ul>
              </div>

              <div>
                <h3 className="font-semibold mb-4">Newsletter</h3>
                <div className="flex flex-col gap-4">
                  <div className="flex gap-1 items-center border rounded border-white px-2">
                    <Image
                      src={"/Email.svg"}
                      alt="Email.svg"
                      width={20}
                      height={20}
                    />
                    <Input
                      type="email"
                      placeholder="Enter email"
                      className="border-none outline-none text-white placeholder:text-white flex-1"
                    />
                  </div>

                  <Button className="bg-white text-[#0010DC] rounded-3xl py-4 hover:bg-white/90 px-3">
                    Subscribe
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-4 md:justify-between flex-col-reverse items-center w-full md:flex-row mt-10">
          <p className="text-xs mt-4 md:text-sm">
            © 2024 Afroliyah Travels. All rights reserved.
          </p>
          <div className="flex gap-2 items-center text-sm">
            <h3 className="font-medium">Follow Us</h3>
            <a href="#" className="p-2 rounded-full border border-white">
              <Instagram className="h-4 w-4" />
            </a>
            <a href="#" className="p-2 rounded-full border border-white">
              <Facebook className="h-4 w-4" />
            </a>
            <a href="#" className="p-2 rounded-full border border-white">
              <Twitter className="h-4 w-4" />
            </a>
            <a href="#" className="p-2 rounded-full border border-white">
              <Youtube className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

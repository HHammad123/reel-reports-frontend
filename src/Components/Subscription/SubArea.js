import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Info, Video } from "lucide-react";

const SuccessModal = ({ isOpen, onClose, credits, planTitle }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
                <div className="flex flex-col items-center text-center">
                    <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
                        <Check className="w-8 h-8 text-green-600" strokeWidth={3} />
                    </div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h3>
                    <p className="text-gray-600 mb-6">
                        You have successfully purchased <span className="font-semibold text-gray-900">{planTitle}</span>.
                        <br />
                        <span className="text-[#13008B] font-bold text-lg">{parseInt(credits).toLocaleString()} credits</span> have been added to your account.
                    </p>
                    <button
                        onClick={onClose}
                        className="w-full py-3 bg-[#13008B] text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors"
                    >
                        Continue
                    </button>
                </div>
            </div>
        </div>
    );
};

const SubArea = () => {
    const [activeTab, setActiveTab] = useState("subscription");
    const location = useLocation();
    const navigate = useNavigate();
    const [processingPayment, setProcessingPayment] = useState(false);
    const [successModal, setSuccessModal] = useState({ show: false, credits: 0, plan: "" });

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const paymentSuccess = query.get("payment_success");
        const creditsToAdd = query.get("credits");
        const planTitle = query.get("plan_title");
        const amount = query.get("amount");

        if (paymentSuccess === "true" && creditsToAdd && amount && !processingPayment) {
            setProcessingPayment(true);
            handlePaymentSuccess(creditsToAdd, planTitle, amount);
        }
    }, [location]);

    const handlePaymentSuccess = async (credits, planTitle, amount) => {
        try {
            const user = JSON.parse(localStorage.getItem("user") || "{}");
            const token = localStorage.getItem("token");
            const userId = user.id;

            if (!userId) {
                alert("User not found. Please log in again.");
                return;
            }

            // Call API to add credits
            const response = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/admin/api/admin/users/${userId}/credits/add`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`, // Include token if needed
                },
                body: JSON.stringify({
                    amount_added: amount.toString(),
                    note: `Purchase - ${planTitle || "Credits"}`,
                }),
            });

            if (response.ok) {
                // Show success modal instead of alert
                setSuccessModal({ show: true, credits, plan: planTitle });
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error("Failed to add credits:", errorData);
                alert("Payment successful, but failed to add credits automatically. Please contact support.");
            }
        } catch (error) {
            console.error("Error adding credits:", error);
            alert("Error adding credits: " + error.message);
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleCloseModal = () => {
        setSuccessModal({ show: false, credits: 0, plan: "" });
        navigate("/subscription", { replace: true });
    };

    const handleSelectPlan = async (plan) => {
        try {
            const response = await fetch("/api/create-checkout-session", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    planTitle: plan.title,
                    amount: plan.price,
                    mode: "payment", // one-time payment
                    // Redirect back to this page with success params
                    successUrl: `${window.location.origin}/subscription?payment_success=true&credits=${plan.credits}&plan_title=${encodeURIComponent(plan.title)}&amount=${plan.price}`,
                    cancelUrl: `${window.location.origin}/subscription`,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data?.error?.message || "Failed to create checkout session");
            }

            if (data?.url) {
                window.location.href = data.url; // ✅ Stripe Checkout opens here
                return;
            }

            throw new Error("No checkout URL returned by backend");
        } catch (error) {
            console.error("Stripe redirect error:", error);
            alert("Could not open Stripe Checkout: " + error.message);
        }
    };

    const tabBase =
        "px-8 py-3 rounded-full text-sm font-medium transition-all duration-200";
    const tabActive = "bg-[#13008B] text-white shadow-lg scale-105";
    const tabInactive = "bg-gray-100 text-gray-600 hover:bg-gray-200";

    const FeatureItem = ({ text }) => (
        <div className="flex items-start gap-3 text-sm text-gray-700">
            <div className="mt-0.5 min-w-[20px] h-5 rounded-full bg-green-100 text-green-600 flex items-center justify-center">
                <Check size={12} strokeWidth={3} />
            </div>
            <span>{text}</span>
        </div>
    );

    const PlanCard = ({
        title,
        price,
        credits,
        features,
        isPopular,
        buttonText = "Choose Plan",
        onSelect,
    }) => (
        <div
            className={`relative flex flex-col p-6 bg-white rounded-2xl border transition-all duration-300 hover:shadow-xl ${isPopular
                ? "border-[#13008B] shadow-lg scale-105 z-10"
                : "border-gray-200 hover:border-gray-300"
                }`}
        >
            {isPopular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#13008B] text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wide">
                    Most Popular
                </div>
            )}

            <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">{title}</h3>
                <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[#13008B]">$ {price}</span>
                    {activeTab === "subscription" && (
                        <span className="text-gray-500">/mo</span>
                    )}
                </div>
                <div className="mt-2 inline-block px-3 py-1 bg-blue-50 text-blue-700 text-sm font-semibold rounded-lg">
                    {credits.toLocaleString()} Credits
                </div>
            </div>

            <div className="flex-1 space-y-4 mb-6">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Video size={16} className="text-gray-400" />
                    <span>~{Math.floor(credits / 225)} mins of video generation</span>
                </div>

                <div className="w-full h-px bg-gray-100" />

                <div className="space-y-3">
                    {features.map((f, i) => (
                        <FeatureItem key={i} text={f} />
                    ))}
                </div>
            </div>

            <button
                onClick={onSelect}
                className={`w-full py-2.5 rounded-xl font-semibold transition-colors ${isPopular
                    ? "bg-[#13008B] text-white hover:bg-blue-800"
                    : "bg-gray-100 text-gray-900 hover:bg-gray-200"
                    }`}
            >
                {buttonText}
            </button>
        </div>
    );

    const subscriptionPlans = [
        {
            title: "Starter",
            price: 30,
            credits: 1250,
            features: ["Access to basic templates", "Standard generation speed", "Email support"],
        },
        {
            title: "Professional",
            price: 75,
            credits: 3750,
            features: ["Access to all templates", "Priority generation", "Priority support", "Commercial usage rights"],
            isPopular: true,
        },
        {
            title: "Business",
            price: 100,
            credits: 5250,
            features: ["All Professional features", "Highest priority queue", "Dedicated account manager", "API access"],
        },
    ];

    const topUpPlans = [
        {
            title: "Small Pack",
            price: 5,
            credits: 200,
            features: ["Great for quick edits", "Valid for 1 year"],
        },
        {
            title: "Medium Pack",
            price: 10,
            credits: 400,
            features: ["Best for short videos", "Valid for 1 year"],
        },
        {
            title: "Large Pack",
            price: 20,
            credits: 850,
            features: ["Best value top-up", "Valid for 1 year"],
            isPopular: true,
        },
    ];

    return (
        <>
            <SuccessModal
                isOpen={successModal.show}
                credits={successModal.credits}
                planTitle={successModal.plan}
                onClose={handleCloseModal}
            />
            <div className="w-full h-[600px] bg-white rounded-xl overflow-y-scroll">
                <div className="max-w-6xl mx-auto p-8">
                    <div className="text-center mb-10">
                        <h2 className="text-3xl font-bold text-gray-900 mb-2">
                            Simple, Transparent Pricing
                        </h2>
                        <p className="text-gray-500">Choose the plan that best fits your needs</p>

                        <div className="mt-8 inline-flex p-1 bg-gray-100 rounded-full">
                            <button
                                onClick={() => setActiveTab("subscription")}
                                className={`${tabBase} ${activeTab === "subscription" ? tabActive : tabInactive
                                    }`}
                            >
                                Subscription Plans
                            </button>
                            <button
                                onClick={() => setActiveTab("topup")}
                                className={`${tabBase} ${activeTab === "topup" ? tabActive : tabInactive}`}
                            >
                                Top Up Credits
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                        {(activeTab === "subscription" ? subscriptionPlans : topUpPlans).map(
                            (plan, idx) => (
                                <PlanCard key={idx} {...plan} onSelect={() => handleSelectPlan(plan)} />
                            )
                        )}
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-8 border border-gray-100">
                        <div className="flex items-center gap-3 mb-6">
                            <Info className="text-[#13008B]" />
                            <h3 className="text-xl font-bold text-gray-900">Credit Usage Guide</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">
                                    Exchange Rate
                                </div>
                                <div className="text-lg font-bold text-gray-900">1 Credit ≈ $ 0.01</div>
                                <div className="text-xs text-gray-400 mt-1">Base value</div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">
                                    Standard Video
                                </div>
                                <div className="text-lg font-bold text-gray-900">225 Credits</div>
                                <div className="text-xs text-gray-400 mt-1">Per 1 minute of video</div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">
                                    Veo3 Generation
                                </div>
                                <div className="text-lg font-bold text-gray-900">30 Credits</div>
                                <div className="text-xs text-gray-400 mt-1">Per 8 seconds</div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-gray-200">
                                <div className="text-xs text-gray-500 uppercase font-semibold mb-1">
                                    Hailou Model
                                </div>
                                <div className="text-lg font-bold text-gray-900">45 Credits</div>
                                <div className="text-xs text-gray-400 mt-1">Per generation</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default SubArea;

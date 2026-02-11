import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check, Video } from "lucide-react";
import { format, addMonths, addYears } from "date-fns";

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

    const API_BASE = "https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net";

    useEffect(() => {
        const query = new URLSearchParams(location.search);
        const paymentSuccess = query.get("payment_success");

        console.log("SubArea: Checking payment status...", { paymentSuccess, search: location.search });

        const pendingPlanStr = localStorage.getItem("pending_plan");

        if (paymentSuccess && pendingPlanStr && !processingPayment) {
            console.log("SubArea: Payment success detected, processing...");
            try {
                const pendingPlan = JSON.parse(pendingPlanStr);
                setProcessingPayment(true);
                handlePaymentSuccess(pendingPlan);
            } catch (e) {
                console.error("Error parsing pending plan", e);
            }
        } else if (paymentSuccess && !pendingPlanStr) {
            console.warn("SubArea: Payment success param found but no pending plan in localStorage.");
        }
    }, [location]);

    const handlePaymentSuccess = async (plan) => {
        console.log("SubArea: Starting handlePaymentSuccess with plan:", plan);
        try {
            const userStr = localStorage.getItem("user");
            const user = userStr ? JSON.parse(userStr) : {};
            const token = localStorage.getItem("token");
            const userId = user.id;

            console.log("SubArea: User details:", { userId, hasToken: !!token });

            if (!userId) {
                alert("User not found. Please log in again.");
                return;
            }

            // 1. Add Credits
            console.log("SubArea: Adding credits...");
            const creditsResponse = await fetch(`${API_BASE}/v1/admin/api/admin/users/${userId}/credits/add`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    amount_added: plan.credits.toString(),
                    note: plan.title,
                }),
            });

            console.log("SubArea: Credits response status:", creditsResponse.status);

            if (!creditsResponse.ok) {
                const errText = await creditsResponse.text();
                console.error("SubArea: Failed to add credits response:", errText);
                throw new Error(`Failed to add credits: ${creditsResponse.status}`);
            }

            // 2. Update Subscription
            console.log("SubArea: Updating subscription...");
            const isTopUp = plan.type === "topup";
            const today = new Date();
            const expiryDate = isTopUp ? addYears(today, 1) : addMonths(today, 1);

            const subscriptionBody = {
                subscription_details: {
                    status: "active",
                    plan: plan.price.toString(),
                    renewal_date: format(today, "yyyy-MM-dd"),
                    expiry_date: format(expiryDate, "yyyy-MM-dd"),
                    subscription_id: `sub_${Date.now()}`,
                    payment_method: "credit_card",
                    billing_cycle: "monthly",
                    add_ons: isTopUp ? [
                        {
                            name: plan.price.toString(),
                            price: parseFloat(plan.price),
                            pack: `${plan.credits}_credits`
                        }
                    ] : []
                }
            };

            const subResponse = await fetch(`${API_BASE}/v1/admin/api/admin/users/${userId}/subscription`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify(subscriptionBody),
            });

            console.log("SubArea: Subscription response status:", subResponse.status);

            if (!subResponse.ok) {
                const errText = await subResponse.text();
                console.error("SubArea: Failed to update subscription response:", errText);
                throw new Error(`Failed to update subscription: ${subResponse.status}`);
            }

            // Success
            console.log("SubArea: Payment processing complete. Showing success modal.");
            localStorage.removeItem("pending_plan");
            setSuccessModal({ show: true, credits: plan.credits, plan: plan.title });

        } catch (error) {
            console.error("Error processing payment success:", error);
            alert("Payment successful, but failed to update account. Please contact support.");
        } finally {
            setProcessingPayment(false);
        }
    };

    const handleCloseModal = () => {
        setSuccessModal({ show: false, credits: 0, plan: "" });
        navigate("/", { replace: true });
    };

    const handleSelectPlan = async (plan) => {
        if (plan.type === 'topup') {
            try {
                setProcessingPayment(true);
                // Save plan details for post-payment processing
                localStorage.setItem("pending_plan", JSON.stringify(plan));

                const userStr = localStorage.getItem("user");
                const user = userStr ? JSON.parse(userStr) : {};
                const token = localStorage.getItem("token");
                const userId = user.id;

                if (!userId) {
                    alert("User not found. Please log in again.");
                    return;
                }

                const response = await fetch(`${API_BASE}/v1/admin/api/payments/create-checkout`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        package: plan.price.toString(),
                        user_id: userId
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to create checkout session");
                }

                const data = await response.json();
                if (data.checkout_url) {
                    window.open(data.checkout_url, '_blank');
                } else {
                    alert("No checkout URL returned from server.");
                    localStorage.removeItem("pending_plan");
                }
            } catch (error) {
                console.error("Error creating checkout session:", error);
                alert("Failed to initiate payment. Please try again.");
                localStorage.removeItem("pending_plan");
            } finally {
                setProcessingPayment(false);
            }
            return;
        }

        if (plan.type === 'subscription') {
            try {
                setProcessingPayment(true);
                const userStr = localStorage.getItem("user");
                const user = userStr ? JSON.parse(userStr) : {};
                const token = localStorage.getItem("token");
                const userId = user.id;

                if (!userId) {
                    alert("User not found. Please log in again.");
                    return;
                }

                const response = await fetch(`${API_BASE}/v1/admin/api/payments/create-subscription`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        plan: plan.price.toString(),
                        user_id: userId
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to create subscription");
                }

                const data = await response.json();
                if (data.checkout_url) {
                    window.open(data.checkout_url, '_blank');
                } else {
                    alert("No checkout URL returned from server.");
                }
            } catch (error) {
                console.error("Error creating subscription:", error);
                alert("Failed to initiate subscription. Please try again.");
            } finally {
                setProcessingPayment(false);
            }
            return;
        }

        alert("No payment link available for this plan.");
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
            type: "subscription",
        },
        {
            title: "Professional",
            price: 70,
            credits: 3750,
            features: ["Access to all templates", "Priority generation", "Priority support", "Commercial usage rights"],
            isPopular: true,
            type: "subscription",
        },
        {
            title: "Business",
            price: 100,
            credits: 5250,
            features: ["All Professional features", "Highest priority queue", "Dedicated account manager", "API access"],
            type: "subscription",
        },
    ];

    const topUpPlans = [
        {
            title: "Small Pack",
            price: 5,
            credits: 200,
            features: ["Great for quick edits", "Valid for 1 year"],
            type: "topup",
        },
        {
            title: "Medium Pack",
            price: 10,
            credits: 400,
            features: ["Best for short videos", "Valid for 1 year"],
            type: "topup",
        },
        {
            title: "Large Pack",
            price: 20,
            credits: 850,
            features: ["Best value top-up", "Valid for 1 year"],
            isPopular: true,
            type: "topup",
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
            <div className="w-full h-full bg-white rounded-xl overflow-y-scroll">
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

                </div>
            </div>
        </>
    );
};

export default SubArea;

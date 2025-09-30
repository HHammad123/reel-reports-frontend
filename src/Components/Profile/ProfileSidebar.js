import { Crown, LogOut, Settings, User, Zap } from 'lucide-react'
import React from 'react'
import { Link, useLocation } from 'react-router-dom';

const ProfileSidebar = () => {
  const location = useLocation();
  const { pathname } = location;
  const splitLocation = pathname.split("/");
  const activeClass = "w-full bg-purple-800 text-white rounded-lg p-4 flex items-center gap-3 text-left font-medium";
  const inactiveClass = "w-full hover:bg-purple-300 rounded-lg p-4 flex items-center gap-3 text-left font-medium text-gray-700 transition-colors";
  return (
    <div>
        <div className="w-80  p-6">
          <div className="space-y-3">
          <Link to="/profile">
            <button className={(splitLocation[1] === "profile") ? activeClass : inactiveClass}>
              <User className="w-5 h-5" />
              <span>My Profile</span>
            </button> 
            </Link>
            <Link to="/brandguidelines">
         <button className={(splitLocation[1] === "brandguidelines") ? activeClass : inactiveClass}>
              <Zap className="w-5 h-5" />
              <span>Brand Guidelines</span>
            </button>
            </Link>
            
           <Link to="/scenesettings">
           <button className={(splitLocation[1] === "scenesettings") ? activeClass : inactiveClass}>
              <Settings className="w-5 h-5" />
              <span>Scenes Settings</span>
            </button>
            </Link>
            
            <Link to="/subscription">
            <button className={(splitLocation[1] === "subscription") ? activeClass : inactiveClass}>
              <Crown className="w-5 h-5" />
              <span>Subscription</span>
            </button>
            </Link>
            
           <Link to="#">
           <button className="w-full hover:bg-purple-300 rounded-lg p-4 flex items-center gap-3 text-left font-medium text-gray-700 transition-colors">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
           </Link>
            
           <Link to={"#"}>
           <button className="w-full hover:bg-purple-300 rounded-lg p-4 flex items-center gap-3 text-left font-medium text-gray-700 transition-colors">
              <LogOut className="w-5 h-5" />
              <span>Logout</span>
            </button>
           </Link>
          </div>
        </div>
    </div>
  )
}

export default ProfileSidebar
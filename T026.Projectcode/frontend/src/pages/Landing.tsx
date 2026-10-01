import { Link } from 'react-router-dom'
import {
  Sparkles,
  ArrowRight,
  Camera,
  FileText,
  MapPin,
  Calendar,
  Bell,
  ShieldCheck,
  Search,
  PackageSearch,
  CheckCircle2,
  Cpu,
  ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Card } from '@/components/ui/Card'

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Report Your Item',
    description:
      'Upload a photo, select a category, and specify when and where the item was lost or found in seconds.',
    icon: Camera,
    color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
  },
  {
    step: '02',
    title: 'Multi-Modal Indexing',
    description:
      'The system indexes visual item features, category vectors, timestamps, and location coordinates.',
    icon: Cpu,
    color: 'bg-purple-500/10 text-purple-400 border-purple-500/30',
  },
  {
    step: '03',
    title: 'Automated Match Ranking',
    description:
      'Cross-references complementary lost and found submissions to identify probable matches.',
    icon: Sparkles,
    color: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  },
  {
    step: '04',
    title: 'Secure Item Return',
    description:
      'Coordinate verified item return with secure account verification and audit trails.',
    icon: CheckCircle2,
    color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  },
]

const FEATURES = [
  {
    icon: Camera,
    title: 'Vision Feature Indexing',
    description:
      'Catalogs high-resolution photos for fast visual recognition and verification.',
  },
  {
    icon: FileText,
    title: 'Semantic Descriptions',
    description:
      'Captures structured descriptive details and distinguishing item markings.',
  },
  {
    icon: MapPin,
    title: 'Location Tagging',
    description:
      'Refines searches based on specific campus, building, or room locations.',
  },
  {
    icon: Calendar,
    title: 'Date & Time Correlation',
    description:
      'Tracks precise timeframes to organize recent lost and found reports.',
  },
  {
    icon: Bell,
    title: 'Alerts & Activity Updates',
    description:
      'Keeps you notified as reports are filed, updated, or marked recovered.',
  },
  {
    icon: ShieldCheck,
    title: 'Encrypted & Authenticated',
    description:
      'Secure user accounts powered by Supabase Auth and Row Level Security.',
  },
]

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#090b10] text-slate-100 font-sans selection:bg-indigo-900 selection:text-white">
      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#0c101a]/85 backdrop-blur-md">
        <div className="mx-auto flex h-18 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white shadow-md shadow-indigo-500/25 border border-indigo-400/20">
              <Sparkles className="h-5 w-5" />
            </span>
            <span className="text-lg font-bold tracking-tight text-white leading-none">
              Lost&amp;Found <span className="text-indigo-400">AI</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link to="/login">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link to="/register">
              <Button size="sm" icon={<ArrowRight className="h-4 w-4" />}>
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-14 pb-20 lg:pt-24 lg:pb-28">
        <div className="absolute inset-0 -z-10 flex items-center justify-center">
          <div className="h-[500px] w-[750px] rounded-full bg-indigo-600/15 blur-3xl" />
          <div className="h-[350px] w-[500px] rounded-full bg-purple-600/15 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            {/* Left Column Text */}
            <div className="text-center lg:text-left lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3.5 py-1 text-xs font-bold text-indigo-300 shadow-2xs">
                <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
                <span>Intelligent Multi-Modal Recovery</span>
              </div>

              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.12]">
                Lost something? <br />
                <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
                  Let's help you find it.
                </span>
              </h1>

              <p className="max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed mx-auto lg:mx-0 font-medium">
                Report lost or found items with a photo and description. Our system catalogs
                visual features, location, and dates to help connect lost belongings with their owners.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3.5 pt-2">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button
                    size="lg"
                    className="w-full sm:w-auto shadow-lg shadow-indigo-600/25"
                    icon={<Search className="h-5 w-5" />}
                  >
                    Report Lost Item
                  </Button>
                </Link>

                <Link to="/register" className="w-full sm:w-auto">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                    icon={<PackageSearch className="h-5 w-5 text-indigo-400" />}
                  >
                    Report Found Item
                  </Button>
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400 font-semibold">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Fast Item Indexing</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Encrypted Data &amp; Privacy</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  <span>Verified Accounts</span>
                </div>
              </div>
            </div>

            {/* Right Column: Clean Platform Capability Showcase */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none rounded-3xl border border-slate-800/90 bg-[#121622] p-7 shadow-[0_8px_30px_rgba(0,0,0,0.6)] space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-xs font-bold text-white">Platform Overview</span>
                  </div>
                  <Badge variant="primary" size="sm">
                    Active System
                  </Badge>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-[#0c101a] p-3.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/30 shrink-0">
                      <Search className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Report Lost Belongings</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">File instant reports with photos, category, and location.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-[#0c101a] p-3.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shrink-0">
                      <PackageSearch className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Turn in Found Items</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">Help reunite items with their rightful owners safely and quickly.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-[#0c101a] p-3.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/30 shrink-0">
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-white">Multi-Modal Matching</p>
                      <p className="text-[11px] text-slate-400 font-medium mt-0.5">Cross-references visual features, descriptions, and timestamps.</p>
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 font-medium">
                  <span className="flex items-center gap-1">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    Authenticated &amp; Encrypted
                  </span>
                  <Link to="/register" className="font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-0.5">
                    Get started <ChevronRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 bg-[#0c101a] border-y border-slate-800/80">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="primary" size="sm">
              Process
            </Badge>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              How Lost&amp;Found AI Works
            </h2>
            <p className="text-slate-400 text-sm sm:text-base font-medium">
              A 4-step pipeline designed to connect lost belongings with their owners.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <div
                key={item.step}
                className="relative rounded-2xl border border-slate-800/90 bg-[#121622] p-6 shadow-[0_4px_20px_rgba(0,0,0,0.35)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.6)] hover:border-slate-700 transition-all duration-200 group flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <span className={`flex h-12 w-12 items-center justify-center rounded-xl border ${item.color} shadow-2xs`}>
                      <item.icon className="h-6 w-6" />
                    </span>
                    <span className="text-2xl font-black text-slate-700 group-hover:text-indigo-400 transition-colors">
                      {item.step}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-[#090b10]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <Badge variant="default" size="sm">
              Capabilities
            </Badge>
            <h2 className="text-3xl font-black tracking-tight text-white sm:text-4xl">
              Engineered for Speed &amp; Security
            </h2>
            <p className="text-slate-400 text-sm sm:text-base font-medium">
              Everything you need to report, find, and claim lost belongings.
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feat) => (
              <Card key={feat.title} hover className="p-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 mb-4 shadow-2xs border border-indigo-500/20">
                  <feat.icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-white mb-1.5">{feat.title}</h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{feat.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="py-16 bg-gradient-to-tr from-indigo-950 via-slate-900 to-[#121622] text-white relative overflow-hidden border-t border-slate-800">
        <div className="mx-auto max-w-5xl px-4 text-center sm:px-6 lg:px-8 space-y-6">
          <h2 className="text-3xl font-black sm:text-4xl tracking-tight text-white">
            Ready to reunite lost belongings with their owners?
          </h2>
          <p className="text-slate-300 text-base max-w-2xl mx-auto leading-relaxed font-medium">
            Join Lost&amp;Found AI today. Report an item in seconds and manage all your reports in one place.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link to="/register">
              <Button size="lg" className="shadow-lg shadow-indigo-600/30">
                Create Free Account
              </Button>
            </Link>
            <Link to="/login">
              <Button variant="ghost" size="lg" className="text-slate-300 hover:text-white hover:bg-slate-800/80">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#0c101a] py-10 text-slate-500">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Sparkles className="h-4 w-4" />
            </span>
            <span className="font-bold text-white text-sm">Lost&amp;Found AI</span>
          </div>

          <div className="text-xs text-center md:text-right text-slate-500 font-medium">
            <p>Built with React, FastAPI, and Supabase</p>
          </div>
        </div>
      </footer>
    </div>
  )
}

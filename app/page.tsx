'use client';

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Heart,
  Shield,
  Users,
  MessageCircle,
  BookOpen,
  Award,
  CheckCircle,
  ArrowRight,
  Star,
  Clock,
  Lock
} from 'lucide-react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const stagger = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 pt-14 pb-16 sm:px-6 sm:pt-16 lg:px-8 lg:pb-20">
        <div className="mx-auto max-w-7xl">
          <motion.div
            className="text-center"
            initial="initial"
            animate="animate"
            variants={stagger}
          >
            <motion.div variants={fadeInUp} className="mb-8">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-blue-100">
                <Heart className="h-10 w-10 text-blue-600" />
              </div>
            </motion.div>

            <motion.h1
              variants={fadeInUp}
              className="text-4xl font-bold tracking-tight text-gray-900 sm:text-6xl"
            >
              Find Your
              <span className="text-blue-600"> Peace</span>
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-600"
            >
              A safe, anonymous space where trained listeners provide emotional support.
              No judgment, no data collection, just genuine human connection when you need it most.
            </motion.p>

            <motion.div variants={fadeInUp} className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/chat">
                <Button asChild size="lg" className="px-8">
                  <a>
                    Start Your Journey
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
                </Button>
              </Link>
              <Link href="#how-it-works" className="text-sm font-semibold leading-6 text-gray-900">
                Learn more <span aria-hidden="true">→</span>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trust Indicators */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            className="mx-auto grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeInUp} className="text-center">
              <Lock className="mx-auto h-8 w-8 text-blue-600" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">100% Anonymous</h3>
              <p className="mt-2 text-sm text-gray-600">No personal data collected or stored</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <Shield className="mx-auto h-8 w-8 text-blue-600" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">Trained Listeners</h3>
              <p className="mt-2 text-sm text-gray-600">Professional emotional support</p>
            </motion.div>
            <motion.div variants={fadeInUp} className="text-center">
              <Clock className="mx-auto h-8 w-8 text-blue-600" />
              <h3 className="mt-4 text-lg font-semibold text-gray-900">24/7 Available</h3>
              <p className="mt-2 text-sm text-gray-600">Support when you need it most</p>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-gray-900">
              How It Works
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-gray-600">
              Simple, private, and effective emotional support
            </motion.p>
          </motion.div>

          <motion.div
            className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-3"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeInUp}>
              <Card className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <MessageCircle className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">1. Start a Session</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Begin an anonymous chat session with a trained listener
                </p>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">2. Connect</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Share what&apos;s on your mind in a safe, judgment-free space
                </p>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card className="text-center">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Heart className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">3. Heal</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Receive compassionate support and emotional guidance
                </p>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-gray-900">
              Core Features
            </motion.h2>
          </motion.div>

          <motion.div
            className="mx-auto mt-16 grid max-w-2xl grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeInUp}>
              <Card>
                <BookOpen className="h-8 w-8 text-blue-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Private Journal</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Track your emotional journey with private journaling
                </p>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card>
                <MessageCircle className="h-8 w-8 text-blue-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Real-time Chat</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Instant messaging with trained emotional support specialists
                </p>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card>
                <Shield className="h-8 w-8 text-blue-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Crisis Support</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Immediate response system for urgent situations
                </p>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card>
                <Users className="h-8 w-8 text-blue-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Support Groups</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Connect with others in moderated support communities
                </p>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card>
                <Award className="h-8 w-8 text-blue-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">Progress Tracking</h3>
                <p className="mt-2 text-sm text-gray-600">
                  Monitor your emotional wellness journey over time
                </p>
              </Card>
            </motion.div>

            <motion.div variants={fadeInUp}>
              <Card>
                <Star className="h-8 w-8 text-blue-600" />
                <h3 className="mt-4 text-lg font-semibold text-gray-900">AI Companion</h3>
                <p className="mt-2 text-sm text-gray-600">
                  24/7 calming exercises and mindfulness guidance
                </p>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Trust & Privacy */}
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-gray-900">
              Your Privacy & Safety
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-gray-600">
              Built with privacy-first principles and emotional safety in mind
            </motion.p>
          </motion.div>

          <motion.div
            className="mx-auto mt-16 max-w-3xl"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeInUp}>
              <Card className="p-8">
                <div className="space-y-4">
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Zero Data Collection</h4>
                      <p className="text-sm text-gray-600">We don&apos;t store any personal information, chat logs, or identifiable data</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Trained Professionals</h4>
                      <p className="text-sm text-gray-600">All listeners are trained in emotional support and crisis intervention</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Crisis Response</h4>
                      <p className="text-sm text-gray-600">Immediate escalation protocols for urgent mental health situations</p>
                    </div>
                  </div>
                  <div className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 mr-3 flex-shrink-0" />
                    <div>
                      <h4 className="font-semibold text-gray-900">Open Source</h4>
                      <p className="text-sm text-gray-600">Transparent codebase ensures accountability and community trust</p>
                    </div>
                  </div>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Partner Universities */}
      <section className="bg-gray-50 py-16">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-gray-900">
              Partner Universities
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-gray-600">
              Collaborating with leading institutions in mental health research
            </motion.p>
          </motion.div>

          <motion.div
            className="mx-auto mt-16 grid max-w-2xl grid-cols-2 gap-8 sm:grid-cols-4"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.div variants={fadeInUp} className="flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-600">UCLA</span>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeInUp} className="flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-600">Stanford</span>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeInUp} className="flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-600">Harvard</span>
                </div>
              </div>
            </motion.div>
            <motion.div variants={fadeInUp} className="flex items-center justify-center">
              <div className="text-center">
                <div className="mx-auto h-12 w-12 rounded-lg bg-gray-200 flex items-center justify-center">
                  <span className="text-sm font-bold text-gray-600">MIT</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Safety Disclaimer */}
      <section className="bg-yellow-50 py-16">
        <div className="mx-auto max-w-3xl px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeInUp} className="text-2xl font-bold text-gray-900">
              Important Safety Information
            </motion.h2>
            <motion.div variants={fadeInUp} className="mt-8">
              <Card className="p-6 text-left">
                <p className="text-sm text-gray-700 mb-4">
                  <strong>Solace is not a crisis hotline.</strong> If you are experiencing a mental health emergency or having thoughts of self-harm, please contact:
                </p>
                <ul className="text-sm text-gray-700 space-y-2 mb-4">
                  <li>• National Suicide Prevention Lifeline: 988</li>
                  <li>• Crisis Text Line: Text HOME to 741741</li>
                  <li>• Emergency Services: 911</li>
                </ul>
                <p className="text-sm text-gray-700">
                  Our trained listeners provide emotional support but are not licensed therapists.
                  For professional mental health treatment, please consult qualified healthcare providers.
                </p>
              </Card>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-6 lg:px-8">
          <motion.div
            className="text-center"
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2 variants={fadeInUp} className="text-3xl font-bold text-gray-900">
              Ready to Start Your Journey?
            </motion.h2>
            <motion.p variants={fadeInUp} className="mt-4 text-lg text-gray-600">
              Take the first step towards emotional wellness. You&apos;re not alone.
            </motion.p>
            <motion.div variants={fadeInUp} className="mt-10">
              <Button size="lg" className="px-12 py-4 text-lg">
                Begin Your Session
                <Heart className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
            <motion.p variants={fadeInUp} className="mt-4 text-sm text-gray-500">
              Completely anonymous • No account required • Free forever
            </motion.p>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

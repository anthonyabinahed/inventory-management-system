"use client";

import { useState } from "react";
import { notFound } from "next/navigation";

// Buttons
import ButtonPopover from "@/components/ButtonPopover";

// UI Components
import Modal from "@/components/Modal";
import Tabs from "@/components/Tabs";
import FAQ from "@/components/FAQ";
import BetterIcon from "@/components/BetterIcon";

import FeaturesListicle from "@/components/FeaturesListicle";
import WithWithout from "@/components/WithWithout";

// Layout
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Section = ({ title, children, id }) => (
  <section id={id} className="py-12 border-b border-base-300">
    <div className="max-w-7xl mx-auto px-8">
      <h2 className="text-2xl font-bold mb-8 text-primary">{title}</h2>
      {children}
    </div>
  </section>
);

const ComponentCard = ({ title, children }) => (
  <div className="bg-base-200 rounded-xl p-6 mb-6">
    <h3 className="text-lg font-semibold mb-4 text-base-content/70">{title}</h3>
    <div className="flex flex-wrap gap-4 items-center">{children}</div>
  </div>
);

export default function PlaygroundPage() {
  // Only accessible in development mode
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const [isModalOpen, setIsModalOpen] = useState(false);

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const sections = [
    { id: "buttons", label: "Buttons" },
    { id: "ui-components", label: "UI Components" },
    { id: "icons", label: "Icons" },
    { id: "features", label: "Features" },
    { id: "faq", label: "FAQ" },
    { id: "comparison", label: "Comparison" },
    { id: "layout", label: "Layout" },
    { id: "typography", label: "Typography" },
  ];

  return (
    <div className="min-h-screen bg-base-100">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-base-100/90 backdrop-blur-sm border-b border-base-300 py-4">
        <div className="max-w-7xl mx-auto px-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-extrabold">Component Playground</h1>
            <span className="badge badge-warning">Temporary Page</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className="btn btn-sm btn-ghost"
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Buttons Section */}
      <Section title="Buttons" id="buttons">
        <ComponentCard title="ButtonPopover">
          <ButtonPopover />
        </ComponentCard>

        <ComponentCard title="Standard DaisyUI Buttons">
          <button className="btn">Default</button>
          <button className="btn btn-primary">Primary</button>
          <button className="btn btn-secondary">Secondary</button>
          <button className="btn btn-accent">Accent</button>
          <button className="btn btn-info">Info</button>
          <button className="btn btn-success">Success</button>
          <button className="btn btn-warning">Warning</button>
          <button className="btn btn-error">Error</button>
          <button className="btn btn-ghost">Ghost</button>
          <button className="btn btn-link">Link</button>
          <button className="btn btn-outline">Outline</button>
          <button className="btn btn-outline btn-primary">Outline Primary</button>
        </ComponentCard>

        <ComponentCard title="Button Sizes">
          <button className="btn btn-lg btn-primary">Large</button>
          <button className="btn btn-md btn-primary">Medium</button>
          <button className="btn btn-sm btn-primary">Small</button>
          <button className="btn btn-xs btn-primary">Extra Small</button>
        </ComponentCard>
      </Section>

      {/* UI Components Section */}
      <Section title="UI Components" id="ui-components">
        <ComponentCard title="Modal">
          <button className="btn btn-primary" onClick={() => setIsModalOpen(true)}>
            Open Modal
          </button>
          <Modal isModalOpen={isModalOpen} setIsModalOpen={setIsModalOpen} />
        </ComponentCard>

        <ComponentCard title="Tabs">
          <div className="w-full">
            <Tabs />
          </div>
        </ComponentCard>

        <ComponentCard title="Badges">
          <span className="badge">Default</span>
          <span className="badge badge-primary">Primary</span>
          <span className="badge badge-secondary">Secondary</span>
          <span className="badge badge-accent">Accent</span>
          <span className="badge badge-ghost">Ghost</span>
          <span className="badge badge-info">Info</span>
          <span className="badge badge-success">Success</span>
          <span className="badge badge-warning">Warning</span>
          <span className="badge badge-error">Error</span>
          <span className="badge badge-outline">Outline</span>
        </ComponentCard>

        <ComponentCard title="Alerts">
          <div className="flex flex-col gap-4 w-full">
            <div className="alert">
              <span>Default alert message</span>
            </div>
            <div className="alert alert-info">
              <span>Info alert message</span>
            </div>
            <div className="alert alert-success">
              <span>Success alert message</span>
            </div>
            <div className="alert alert-warning">
              <span>Warning alert message</span>
            </div>
            <div className="alert alert-error">
              <span>Error alert message</span>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Loading States">
          <span className="loading loading-spinner loading-xs"></span>
          <span className="loading loading-spinner loading-sm"></span>
          <span className="loading loading-spinner loading-md"></span>
          <span className="loading loading-spinner loading-lg"></span>
          <span className="loading loading-dots loading-md"></span>
          <span className="loading loading-ring loading-md"></span>
          <span className="loading loading-ball loading-md"></span>
          <span className="loading loading-bars loading-md"></span>
        </ComponentCard>

        <ComponentCard title="Progress">
          <div className="flex flex-col gap-4 w-full max-w-md">
            <progress className="progress" value="0" max="100"></progress>
            <progress className="progress progress-primary" value="25" max="100"></progress>
            <progress className="progress progress-secondary" value="50" max="100"></progress>
            <progress className="progress progress-accent" value="75" max="100"></progress>
            <progress className="progress progress-success" value="100" max="100"></progress>
          </div>
        </ComponentCard>

        <ComponentCard title="Tooltips">
          <div className="tooltip" data-tip="Default tooltip">
            <button className="btn">Hover me</button>
          </div>
          <div className="tooltip tooltip-primary" data-tip="Primary tooltip">
            <button className="btn btn-primary">Primary</button>
          </div>
          <div className="tooltip tooltip-secondary" data-tip="Secondary tooltip">
            <button className="btn btn-secondary">Secondary</button>
          </div>
        </ComponentCard>
      </Section>

      {/* Icons Section */}
      <Section title="Icons" id="icons">
        <ComponentCard title="BetterIcon">
          <BetterIcon>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
            </svg>
          </BetterIcon>
          <BetterIcon>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
            </svg>
          </BetterIcon>
          <BetterIcon>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 8.287 8.287 0 009 9.6a8.983 8.983 0 013.361-6.867 8.21 8.21 0 003 2.48z" />
            </svg>
          </BetterIcon>
        </ComponentCard>
      </Section>


      <Section title="">
        <h3 className="text-xl font-semibold mb-4">FeaturesListicle:</h3>
      </Section>
      <FeaturesListicle />

      {/* FAQ Section */}
      <Section title="FAQ Section" id="faq">
        <p className="text-base-content/60 mb-4">Accordion-style FAQ:</p>
      </Section>
      <FAQ />

      {/* Comparison Section */}
      <Section title="Comparison (With/Without)" id="comparison">
        <p className="text-base-content/60 mb-4">Before/after comparison:</p>
      </Section>
      <WithWithout />

      {/* Layout Components */}
      <Section title="Layout Components" id="layout">
        <ComponentCard title="Header (with mock user)">
          <div className="w-full border rounded-lg overflow-hidden">
            <Header user={{ email: "demo@example.com" }} />
          </div>
        </ComponentCard>

        <ComponentCard title="Header (no user)">
          <div className="w-full border rounded-lg overflow-hidden">
            <Header user={null} />
          </div>
        </ComponentCard>

        <h3 className="text-xl font-semibold mt-8 mb-4">Footer:</h3>
      </Section>
      <Footer />

      {/* Typography & Colors */}
      <Section title="Typography & Colors" id="typography">
        <ComponentCard title="Text Sizes">
          <div className="flex flex-col gap-2">
            <p className="text-xs">text-xs - Extra small text</p>
            <p className="text-sm">text-sm - Small text</p>
            <p className="text-base">text-base - Base text</p>
            <p className="text-lg">text-lg - Large text</p>
            <p className="text-xl">text-xl - Extra large text</p>
            <p className="text-2xl">text-2xl - 2XL text</p>
            <p className="text-3xl">text-3xl - 3XL text</p>
            <p className="text-4xl font-bold">text-4xl bold - Heading</p>
          </div>
        </ComponentCard>

        <ComponentCard title="Color Swatches">
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-primary rounded-lg"></div>
              <span className="text-xs mt-1">primary</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-secondary rounded-lg"></div>
              <span className="text-xs mt-1">secondary</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-accent rounded-lg"></div>
              <span className="text-xs mt-1">accent</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-neutral rounded-lg"></div>
              <span className="text-xs mt-1">neutral</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-base-100 border rounded-lg"></div>
              <span className="text-xs mt-1">base-100</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-base-200 rounded-lg"></div>
              <span className="text-xs mt-1">base-200</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-base-300 rounded-lg"></div>
              <span className="text-xs mt-1">base-300</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-info rounded-lg"></div>
              <span className="text-xs mt-1">info</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-success rounded-lg"></div>
              <span className="text-xs mt-1">success</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-warning rounded-lg"></div>
              <span className="text-xs mt-1">warning</span>
            </div>
            <div className="flex flex-col items-center">
              <div className="w-16 h-16 bg-error rounded-lg"></div>
              <span className="text-xs mt-1">error</span>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Cards">
          <div className="card w-72 bg-base-200 shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Card Title</h2>
              <p>Card content goes here. This is a basic card component.</p>
              <div className="card-actions justify-end">
                <button className="btn btn-primary btn-sm">Action</button>
              </div>
            </div>
          </div>
          <div className="card w-72 bg-primary text-primary-content shadow-xl">
            <div className="card-body">
              <h2 className="card-title">Primary Card</h2>
              <p>This card uses primary color as background.</p>
              <div className="card-actions justify-end">
                <button className="btn btn-sm">Action</button>
              </div>
            </div>
          </div>
        </ComponentCard>

        <ComponentCard title="Inputs">
          <input type="text" placeholder="Default input" className="input input-bordered w-full max-w-xs" />
          <input type="text" placeholder="Primary input" className="input input-bordered input-primary w-full max-w-xs" />
          <input type="text" placeholder="Secondary input" className="input input-bordered input-secondary w-full max-w-xs" />
          <input type="text" placeholder="Accent input" className="input input-bordered input-accent w-full max-w-xs" />
        </ComponentCard>

        <ComponentCard title="Form Elements">
          <div className="form-control">
            <label className="label cursor-pointer gap-4">
              <span className="label-text">Checkbox</span>
              <input type="checkbox" defaultChecked className="checkbox checkbox-primary" />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer gap-4">
              <span className="label-text">Toggle</span>
              <input type="checkbox" defaultChecked className="toggle toggle-primary" />
            </label>
          </div>
          <div className="form-control">
            <label className="label cursor-pointer gap-4">
              <span className="label-text">Radio</span>
              <input type="radio" name="radio-1" className="radio radio-primary" defaultChecked />
            </label>
          </div>
          <select className="select select-bordered w-full max-w-xs">
            <option disabled>Select option</option>
            <option>Option 1</option>
            <option>Option 2</option>
            <option>Option 3</option>
          </select>
        </ComponentCard>
      </Section>

      {/* Bottom padding */}
      <div className="h-24"></div>
    </div>
  );
}

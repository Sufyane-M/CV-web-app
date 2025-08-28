import React, { useState, Suspense } from 'react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../utils/cn';

export interface FAQItem {
  id?: string;
  question: string;
  answer: string;
  icon?: React.ComponentType<{ className?: string }>;
  category?: string;
}

export interface FAQProps {
  items: FAQItem[];
  title?: string;
  subtitle?: string;
  className?: string;
  allowMultiple?: boolean;
  searchable?: boolean;
  categories?: string[];
}

const FAQ: React.FC<FAQProps> = ({
  items,
  title = "Domande Frequenti",
  subtitle = "Trova qui le risposte alle domande più comuni.",
  className,
  allowMultiple = false,
  searchable = true,
  categories
}) => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    
    if (allowMultiple) {
      if (newOpenItems.has(index)) {
        newOpenItems.delete(index);
      } else {
        newOpenItems.add(index);
      }
    } else {
      if (newOpenItems.has(index)) {
        newOpenItems.clear();
      } else {
        newOpenItems.clear();
        newOpenItems.add(index);
      }
    }
    
    setOpenItems(newOpenItems);
  };

  const filteredItems = items.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || 
      item.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const uniqueCategories = categories || 
    Array.from(new Set(items.map(item => item.category).filter(Boolean)));

  return (
    <div className={cn("w-full max-w-4xl mx-auto", className)}>
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
          {title}
        </h2>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          {subtitle}
        </p>
      </div>

      {/* Search and Filters */}
      {(searchable || uniqueCategories.length > 0) && (
        <div className="mb-8 space-y-4">
          {searchable && (
            <div className="relative">
              <input
                type="text"
                placeholder="Cerca nelle domande frequenti..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 text-gray-900 dark:text-white bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                aria-label="Cerca nelle domande frequenti"
              />
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
          )}

          {uniqueCategories.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('all')}
                className={cn(
                  "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                  selectedCategory === 'all'
                    ? "bg-primary-500 text-white shadow-lg"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                )}
              >
                Tutte
              </button>
              {uniqueCategories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    selectedCategory === category
                      ? "bg-primary-500 text-white shadow-lg"
                      : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                  )}
                >
                  {category}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAQ Items */}
      <div className="space-y-4">
        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 dark:text-gray-500 mb-4">
              <svg className="mx-auto h-12 w-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33" />
              </svg>
            </div>
            <p className="text-gray-500 dark:text-gray-400">
              Nessuna domanda trovata per la ricerca "{searchTerm}"
            </p>
          </div>
        ) : (
          filteredItems.map((faq, index) => {
            const isOpen = openItems.has(index);
            const IconComponent = faq.icon;
            
            return (
              <motion.div
                key={faq.id || index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="group"
              >
                <div className={cn(
                  "bg-white dark:bg-gray-800 rounded-xl border transition-all duration-200 overflow-hidden",
                  isOpen 
                    ? "border-primary-200 dark:border-primary-700 shadow-lg ring-1 ring-primary-100 dark:ring-primary-800" 
                    : "border-gray-200 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600"
                )}>
                  <button
                    onClick={() => toggleItem(index)}
                    className="w-full px-6 py-5 text-left focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-inset transition-all duration-200"
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${index}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-4 flex-1">
                        {IconComponent && (
                          <div className={cn(
                            "flex-shrink-0 mt-1 transition-colors duration-200",
                            isOpen ? "text-primary-500" : "text-gray-400 group-hover:text-primary-400"
                          )}>
                            <IconComponent className="h-6 w-6" />
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className={cn(
                            "text-lg font-semibold transition-colors duration-200",
                            isOpen 
                              ? "text-primary-900 dark:text-primary-100" 
                              : "text-gray-900 dark:text-white group-hover:text-primary-700 dark:group-hover:text-primary-300"
                          )}>
                            {faq.question}
                          </h3>
                          {faq.category && (
                            <span className="inline-block mt-1 px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-full">
                              {faq.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className={cn(
                        "flex-shrink-0 ml-4 transition-all duration-200",
                        isOpen ? "text-primary-500 rotate-180" : "text-gray-400 group-hover:text-primary-400"
                      )}>
                        <ChevronDownIcon className="h-6 w-6" />
                      </div>
                    </div>
                  </button>
                  
                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        id={`faq-answer-${index}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="px-6 pb-6">
                          <div className={cn(
                            "pl-10 border-l-2 border-primary-100 dark:border-primary-800",
                            IconComponent ? "ml-0" : "ml-0"
                          )}>
                            <motion.div
                              initial={{ opacity: 0, y: -10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.2, delay: 0.1 }}
                              className="prose prose-gray dark:prose-invert max-w-none"
                            >
                              <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                                {faq.answer}
                              </p>
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Results Counter */}
      {searchTerm && (
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {filteredItems.length} {filteredItems.length === 1 ? 'risultato trovato' : 'risultati trovati'}
          </p>
        </div>
      )}
    </div>
  );
};

export default FAQ;
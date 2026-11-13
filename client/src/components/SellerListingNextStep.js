import React from 'react';
import { Link } from 'react-router-dom';
import { listingChecklist } from '../utils/listingGuidance';

export default function SellerListingNextStep({ project }) {
  if (!(project.is_for_sale === true || project.is_for_sale === 1)) return null;
  const items = listingChecklist(project);
  const missing = items.filter(item => !item.done);
  return <div className="border-t border-[#343a32] pt-4 text-sm">
    <p className="text-[#d5efae] font-medium">{missing.length ? 'Help buyers evaluate this project' : 'Buyer details filled in'}</p>
    <p className="text-gray-400 text-xs mt-2">{items.length - missing.length}/{items.length} details filled in. Seller-provided information; ownership and payments are checked separately.</p>
    {missing.length > 0 && <Link className="inline-block text-white underline underline-offset-4 mt-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#d5efae]"
      to={`/projects/edit/${project.project_id}#${missing[0].id}`}>{missing[0].label} →</Link>}
  </div>;
}

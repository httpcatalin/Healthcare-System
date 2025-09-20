from __future__ import annotations
import os
from datetime import datetime
from pymongo import MongoClient

MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME = os.environ.get('MONGO_DB', 'healthcare')


def connect():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]
    return db


def clear_collections(db):
    db.suppliers.delete_many({})
    db.inventory.delete_many({})
    db.purchase_orders.delete_many({})


def seed_suppliers(db):
    suppliers = [
        {
            'name': 'MediSupply SRL',
            'contact': 'office@medisupply.example',
            'phone': '+40 21 000 0000',
            'address': 'Strada Exemplu 1, Bucuresti, Romania',
            'createdAt': datetime.utcnow(),
        },
        {
            'name': 'Global MedTech',
            'contact': 'sales@globalmed.example',
            'phone': '+40 21 111 1111',
            'address': 'Calea Test 45, Cluj, Romania',
            'createdAt': datetime.utcnow(),
        },
    ]
    res = db.suppliers.insert_many(suppliers)
    return res.inserted_ids


def seed_inventory(db, supplier_ids):
    items = [
        {
            'name': 'Surgical Mask (Box 50)',
            'sku': 'SM-50',
            'supplierId': supplier_ids[0],
            'category': 'PPE',
            'currentStock': 500,
            'minStock': 100,
            'price': 0.5,
            'lastUpdated': datetime.utcnow(),
        },
        {
            'name': 'Latex Gloves (Pack 100)',
            'sku': 'LG-100',
            'supplierId': supplier_ids[1],
            'category': 'Consumables',
            'currentStock': 200,
            'minStock': 50,
            'price': 5.0,
            'lastUpdated': datetime.utcnow(),
        },
        {
            'name': 'Paracetamol 500mg (Box 20)',
            'sku': 'PCT-500-20',
            'supplierId': supplier_ids[0],
            'category': 'Medicines',
            'currentStock': 150,
            'minStock': 30,
            'price': 2.0,
            'lastUpdated': datetime.utcnow(),
        },
    ]
    res = db.inventory.insert_many(items)
    return res.inserted_ids


def seed_purchase_orders(db, supplier_ids, item_ids):
    po = {
        'supplierId': supplier_ids[0],
        'items': [
            {'itemId': item_ids[0], 'quantity': 100, 'price': 0.45},
            {'itemId': item_ids[2], 'quantity': 200, 'price': 1.8},
        ],
        'status': 'created',
        'createdAt': datetime.utcnow(),
        'updatedAt': datetime.utcnow(),
    }
    res = db.purchase_orders.insert_one(po)
    return res.inserted_id


def main(clear=False):
    db = connect()
    if clear:
        clear_collections(db)
    sup_ids = seed_suppliers(db)
    item_ids = seed_inventory(db, sup_ids)
    po_id = seed_purchase_orders(db, sup_ids, item_ids)
    print('Seed complete')
    print('Suppliers:', len(sup_ids))
    print('Inventory items:', len(item_ids))
    print('Sample PO id:', po_id)


if __name__ == '__main__':
    import argparse
    p = argparse.ArgumentParser()
    p.add_argument('--clear', action='store_true', help='Clear collections before seeding')
    args = p.parse_args()
    main(clear=args.clear)

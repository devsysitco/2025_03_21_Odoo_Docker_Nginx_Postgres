# -*- coding: utf-8 -*-
#############################################################################
#    A part of Open HRMS Project <https://www.openhrms.com>
#
#    Cybrosys Technologies Pvt. Ltd.
#
#    Copyright (C) 2024-TODAY Cybrosys Technologies(<https://www.cybrosys.com>)
#    Author: Cybrosys Techno Solutions(<https://www.cybrosys.com>)
#
#    You can modify it under the terms of the GNU LESSER
#    GENERAL PUBLIC LICENSE (LGPL v3), Version 3.
#
#    This program is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU LESSER GENERAL PUBLIC LICENSE (LGPL v3) for more details.
#
#    You should have received a copy of the GNU LESSER GENERAL PUBLIC LICENSE
#    (LGPL v3) along with this program.
#    If not, see <http://www.gnu.org/licenses/>.
#
#############################################################################
from odoo import api, fields, models


class ResUsers(models.Model):
    """ Inherited class of res user to override the create function"""
    _inherit = 'res.users'

    employee_id = fields.Many2one('hr.employee',
                                  string='Related Employee',
                                  ondelete='restrict', auto_join=True,
                                  help='Related employee based on the'
                                       ' data of the user')

    @api.model_create_multi
    def create(self, vals):
        """Overrides the default 'create' method to create an employee record
        when a new user is created, only if an employee does not already exist."""
        result = super(ResUsers, self).create(vals)
        
        # Check if an employee already exists for this user_id
        for user in result:
            if not self.env['hr.employee'].sudo().search([('user_id', '=', user.id)]):
                # Create a new employee only if it does not already exist
                self.env['hr.employee'].sudo().create({
                    'name': user.name,
                    'user_id': user.id,
                    'private_street': user.partner_id.id
                })
        
        return result
